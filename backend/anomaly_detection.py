# ------------------------------------------------------
# anomaly_detection.py — Statistical Pattern Detection
# ------------------------------------------------------
# Rolling z-scores and streak detection over each user's
# own recent logs. No trained model here on purpose, a
# z-score against someone's own history is easier to
# justify in the report, easier to debug when it misfires,
# and doesn't need training data FitLoop doesn't have yet.
# The clustering / engagement-prediction stretch goals can
# sit on top of this later without changing how it works
# ------------------------------------------------------

from dataclasses import dataclass
from statistics import mean, stdev


@dataclass
class Anomaly:
    metric: str
    current_value: float
    baseline_mean: float
    baseline_stdev: float
    z_score: float
    direction: str  # "drop" or "spike"


def _z_score(value, baseline):
    if len(baseline) < 3:
        # Not enough history to know what's normal yet. Returning 0
        # here means a brand new user just gets no anomalies for their
        # first few days, rather than an error.
        return 0.0

    m = mean(baseline)
    s = stdev(baseline)

    if s == 0:
        # A perfectly flat baseline (e.g. exactly 8 hours every night)
        # would otherwise divide by zero. Treat any change from a flat
        # baseline as a full anomaly, no change as none.
        return 0.0 if value == m else 4.0

    return (value - m) / s


def detect_metric_anomaly(metric_name, recent_values, baseline_window=7, threshold=1.5):
    """
    Compares the most recent value for one metric against the mean and
    standard deviation of the preceding baseline_window days.

    threshold=1.5 standard deviations is looser than the textbook 2.0,
    on purpose. Sleep and step counts are noisy day to day, a stricter
    threshold either misses real changes or fires often enough that
    people start ignoring it. This is a starting guess rather than a
    tuned value, adjust it once there's real usability test data to
    tune it against.
    """
    if len(recent_values) < baseline_window + 1:
        return None

    *baseline, current = recent_values[-(baseline_window + 1):]

    if current is None or any(v is None for v in baseline):
        return None

    z = _z_score(current, baseline)

    if abs(z) < threshold:
        return None

    return Anomaly(
        metric=metric_name,
        current_value=current,
        baseline_mean=mean(baseline),
        baseline_stdev=stdev(baseline) if len(baseline) > 1 else 0.0,
        z_score=z,
        direction="drop" if z < 0 else "spike",
    )


def detect_streak(recent_values, condition, min_streak=3):
    """
    Flags a run of consecutive days meeting condition (e.g. "below 6
    hours sleep") rather than a single bad day. One late night isn't
    worth a prompt, three in a row is the actual pattern worth catching.
    """
    streak = 0
    for value in reversed(recent_values):
        if value is not None and condition(value):
            streak += 1
        else:
            break
    return streak >= min_streak, streak
