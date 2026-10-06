"""
Claude API engine with prompt caching and streaming.
Replicates Claude CLI's context-aware behavior via API.

Cost optimization:
- Prompt caching: system prompt marked with cache_control, 90% discount on turns 2+
- Streaming: SSE delivery, first token <500ms, eliminates retry duplicates
"""
from __future__ import annotations
import json
import logging
import os

from anthropic import AsyncAnthropic

log = logging.getLogger("builder.claude")

DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "4096"))


def _cached_system_block(text):
    """Wrap system prompt text in a cache_control block for Anthropic prompt caching."""
    return [
        {
            "type": "text",
            "text": text,
            "cache_control": {"type": "ephemeral"},
        }
    ]


class ClaudeEngine:
    """Context-aware Claude API wrapper with prompt caching and streaming."""

    def __init__(self, api_key=None):
        key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY is required for Builder Studio")
        self.client = AsyncAnthropic(api_key=key)
        self.model = DEFAULT_MODEL

    async def build_system_prompt(self, storage):
        """Aggregate all workspace context files into a system prompt string."""
        context_files = await storage.list_context_files()
        blocks = []
        for f in context_files:
            content = await storage.get_context_file(f["filename"])
            if content.strip():
                blocks.append(
                    "=== FILE: {} (category: {}) ===\n{}\n=== END ===".format(
                        f["filename"], f.get("category", "context"), content
                    )
                )

        if not blocks:
            return (
                "You are a clinical hypnotherapy practice assistant for VRishi Hypnotherapy. "
                "Practitioner: Jithendran Sellamuthu, C.MH., AHA #007913. "
                "Scope: CA B&P 2908 (vocational/avocational self-improvement). "
                "SMART goals must be SUBJECTIVE. No HMI branding in client-facing materials. "
                "AI is advisory only."
            )

        return (
            "You are acting inside the VRishi Academy workspace. Below are project files "
            "containing rules, context, and constraints. Respect them absolutely:\n\n"
            + "\n\n".join(blocks)
        )

    @staticmethod
    def _extract_usage(usage):
        """Extract all usage fields including cache stats."""
        result = {
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "total_tokens": usage.input_tokens + usage.output_tokens,
        }
        # Cache stats (present when prompt caching is active)
        cache_creation = getattr(usage, "cache_creation_input_tokens", 0) or 0
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        result["cache_creation_input_tokens"] = cache_creation
        result["cache_read_input_tokens"] = cache_read
        if cache_read > 0 or cache_creation > 0:
            result["cache_hit"] = cache_read > 0
        return result

    async def chat(
        self,
        prompt,
        storage,
        session_id="default",
        continue_session=True,
        model=None,
        max_tokens=None,
    ):
        """Send a message with cached system prompt and session history."""
        system_prompt = await self.build_system_prompt(storage)
        use_model = model or self.model
        use_max = max_tokens or MAX_TOKENS

        messages = []
        if continue_session:
            session_data = await storage.load_session(session_id)
            messages = session_data.get("messages", [])

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.messages.create(
                model=use_model,
                max_tokens=use_max,
                system=_cached_system_block(system_prompt),
                messages=messages,
            )

            assistant_text = response.content[0].text
            usage = self._extract_usage(response.usage)

            if continue_session:
                messages.append({"role": "assistant", "content": assistant_text})
                await storage.save_session(
                    session_id, messages, model=use_model, token_count=usage["total_tokens"]
                )

            result = {
                "response": assistant_text,
                "model": use_model,
                "session_id": session_id,
                "session_length": len(messages),
            }
            result.update(usage)
            return result

        except Exception as e:
            log.error("Claude API error: %s", e)
            raise

    async def chat_stream(
        self,
        prompt,
        storage,
        session_id="default",
        continue_session=True,
        model=None,
        max_tokens=None,
    ):
        """Stream a response with cached system prompt. Yields text chunks, then a final dict."""
        system_prompt = await self.build_system_prompt(storage)
        use_model = model or self.model
        use_max = max_tokens or MAX_TOKENS

        messages = []
        if continue_session:
            session_data = await storage.load_session(session_id)
            messages = session_data.get("messages", [])

        messages.append({"role": "user", "content": prompt})

        full_text = ""
        async with self.client.messages.stream(
            model=use_model,
            max_tokens=use_max,
            system=_cached_system_block(system_prompt),
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                full_text += text
                yield {"type": "text", "text": text}

            # Get final message with usage stats
            response = await stream.get_final_message()

        usage = self._extract_usage(response.usage)

        # Save session after stream completes
        if continue_session:
            messages.append({"role": "assistant", "content": full_text})
            await storage.save_session(
                session_id, messages, model=use_model, token_count=usage["total_tokens"]
            )

        # Final event with stats
        done_event = {
            "type": "done",
            "model": use_model,
            "session_id": session_id,
            "session_length": len(messages),
        }
        done_event.update(usage)
        yield done_event

    async def generate_structured(
        self,
        prompt,
        storage,
        output_format="json",
        model=None,
    ):
        """One-shot structured generation with cached system prompt."""
        system_prompt = await self.build_system_prompt(storage)
        use_model = model or self.model

        format_instruction = ""
        if output_format == "json":
            format_instruction = "\n\nRespond with valid JSON only. No markdown fences."

        response = await self.client.messages.create(
            model=use_model,
            max_tokens=MAX_TOKENS,
            system=_cached_system_block(system_prompt + format_instruction),
            messages=[{"role": "user", "content": prompt}],
        )

        result = {
            "response": response.content[0].text,
            "model": use_model,
        }
        result.update(self._extract_usage(response.usage))
        return result

    async def close(self):
        await self.client.close()
