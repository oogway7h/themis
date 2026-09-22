import numpy as np


class BaselineProjection:
    name = "linear-least-squares"

    def fit_predict(
        self,
        t: list[int],
        votes: list[int],
        horizon: int,
    ) -> tuple[list[int], list[int]]:
        if len(t) == 0:
            return [], []

        if len(t) == 1:
            last_t = t[-1]
            last_value = votes[-1]
            future_t = [last_t + step for step in range(1, horizon + 1)]
            return future_t, [last_value] * horizon

        x = np.asarray(t, dtype=float)
        y = np.asarray(votes, dtype=float)

        slope, intercept = np.polyfit(x, y, 1)

        last_t = int(t[-1])
        future_t = [last_t + step for step in range(1, horizon + 1)]
        predicted = [intercept + slope * value for value in future_t]

        floor = float(votes[-1])
        monotonic: list[int] = []
        for value in predicted:
            floor = max(floor, value)
            monotonic.append(int(round(floor)))

        return future_t, monotonic
