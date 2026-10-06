"""
Claude API engine with project context injection.
Replicates Claude CLI's context-aware behavior via API.
"""
from __future__ import annotations
import logging
import os
from typing import Optional

from anthropic import AsyncAnthropic

log = logging.getLogger("builder.claude")

DEFAULT_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "4096"))


class ClaudeEngine:
    """Context-aware Claude API wrapper."""

    def __init__(self, api_key: str = None):
        key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY is required for Builder Studio")
        self.client = AsyncAnthropic(api_key=key)
        self.model = DEFAULT_MODEL

    async def build_system_prompt(self, storage) -> str:
        """Aggregate all workspace context files into a system prompt."""
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

    async def chat(
        self,
        prompt: str,
        storage,
        session_id: str = "default",
        continue_session: bool = True,
        model: str = None,
        max_tokens: int = None,
    ) -> dict:
        """Send a message with full project context and session history."""
        system_prompt = await self.build_system_prompt(storage)
        use_model = model or self.model
        use_max = max_tokens or MAX_TOKENS

        # Load or start session
        messages = []
        if continue_session:
            session_data = await storage.load_session(session_id)
            messages = session_data.get("messages", [])

        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.messages.create(
                model=use_model,
                max_tokens=use_max,
                system=system_prompt,
                messages=messages,
            )

            assistant_text = response.content[0].text
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            total_tokens = input_tokens + output_tokens

            # Save session
            if continue_session:
                messages.append({"role": "assistant", "content": assistant_text})
                await storage.save_session(
                    session_id, messages, model=use_model, token_count=total_tokens
                )

            return {
                "response": assistant_text,
                "model": use_model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
                "session_id": session_id,
                "session_length": len(messages),
            }

        except Exception as e:
            log.error("Claude API error: %s", e)
            raise

    async def generate_structured(
        self,
        prompt: str,
        storage,
        output_format: str = "json",
        model: str = None,
    ) -> dict:
        """One-shot structured generation (no session history). For intake->plan, post-session->AVS."""
        system_prompt = await self.build_system_prompt(storage)
        use_model = model or self.model

        format_instruction = ""
        if output_format == "json":
            format_instruction = "\n\nRespond with valid JSON only. No markdown fences."

        response = await self.client.messages.create(
            model=use_model,
            max_tokens=MAX_TOKENS,
            system=system_prompt + format_instruction,
            messages=[{"role": "user", "content": prompt}],
        )

        return {
            "response": response.content[0].text,
            "model": use_model,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }

    async def close(self):
        await self.client.close()
