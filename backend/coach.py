# ------------------------------------------------------
# coach.py — Rule-Based Coach Logic
# ------------------------------------------------------
# Turns a detected streak into a short message. Plain
# if/else rules rather than a model, because the brief
# specifically wants gentle prompts rather than alerts, and
# it's much easier to guarantee a rule-based system never
# produces an alarming message than to guarantee that of a
# generative one. If a small LLM step gets added later to
# vary the phrasing, it should sit downstream of these
# rules and never get to override what they decide to say
# ------------------------------------------------------

from dataclasses import dataclass
from datetime import datetime


@dataclass
class CoachMessage:
    headline: str
    detail: str
    metric: str


# Wording depends on the user's coaching_style (see the User model).
# Gentle is the default, direct is opt-in for people who find the soft
# version patronising rather than reassuring.
_TEMPLATES = {
    "sleep": {
        "gentle": "Sleep's been lower than usual the last {streak} nights. No pressure, just flagging it in case an early one helps tonight.",
        "direct": "{streak} nights under your usual sleep. Try sleeping earlier tonight.",
    },
    "steps": {
        "gentle": "It's been a quieter {streak} days activity-wise. A short walk tomorrow could be a nice reset, only if you fancy it.",
        "direct": "{streak} low-activity days in a row. A 10-minute walk would break the pattern.",
    },
    "study_hours": {
        "gentle": "Study hours have crept later into the night recently. Worth keeping an eye on, especially alongside sleep.",
        "direct": "Late-night study is trending up. Consider moving some of it earlier in the day.",
    },
}


def build_coach_message(metric, streak, coaching_style="gentle"):
    template_set = _TEMPLATES.get(metric)
    if template_set is None:
        return None

    style = coaching_style if coaching_style in template_set else "gentle"
    headline = template_set[style].format(streak=streak)

    return CoachMessage(
        headline=headline,
        detail=f"Based on the last {streak} days of {metric.replace('_', ' ')} data.",
        metric=metric,
    )


def should_send(metric, last_sent_at, min_gap_days=3):
    """
    Basic alert-fatigue guard, don't resend a message about the same
    metric more often than min_gap_days, even if the pattern is still
    active. The brief calls this risk out directly, so it's handled
    here rather than left as a stretch goal.
    """
    if last_sent_at is None:
        return True
    return (datetime.utcnow() - last_sent_at).days >= min_gap_days
