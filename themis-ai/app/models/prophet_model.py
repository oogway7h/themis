from datetime import datetime
import pandas as pd
from prophet import Prophet

class ProphetProjection:
    name = "prophet-logistic"

    def fit_predict(
        self,
        t: list[int],
        votes: list[int],
        horizon: int,
        start_time: datetime | None = None,
        cap: int | None = None,
    ) -> tuple[list[int], list[int], list[int], list[int]]:
        
        if len(t) < 2:
            if len(t) == 1:
                return [t[0] + step for step in range(1, horizon + 1)], [votes[-1]] * horizon, [0]*horizon, [0]*horizon
            return [], [], [], []

        if start_time:
            dates = pd.to_datetime(start_time).tz_localize(None) + pd.to_timedelta(t, unit='m')
        else:
            dates = pd.to_datetime(t, unit='m', origin='unix')

        df = pd.DataFrame({
            'ds': dates,
            'y': votes
        })
        
        # Logistic Growth si tenemos el cap, sino Linear
        if cap is not None and cap > votes[-1]:
            df['cap'] = cap
            m = Prophet(growth='logistic', daily_seasonality=False, weekly_seasonality=False, yearly_seasonality=False)
        else:
            m = Prophet(growth='linear', daily_seasonality=False, weekly_seasonality=False, yearly_seasonality=False)
            
        m.fit(df)
        
        last_t = t[-1]
        future_t = [last_t + step for step in range(1, horizon + 1)]
        
        if start_time:
            future_dates = pd.to_datetime(start_time).tz_localize(None) + pd.to_timedelta(future_t, unit='m')
        else:
            future_dates = pd.to_datetime(future_t, unit='m', origin='unix')
            
        future = pd.DataFrame({
            'ds': future_dates
        })
        if cap is not None and cap > votes[-1]:
            future['cap'] = cap
            
        forecast = m.predict(future)
        
        # 1. Turnout (Empadronamiento) - monotonic
        predicted = forecast['yhat'].values
        floor = float(votes[-1])
        turnout: list[int] = []
        for value in predicted:
            floor = max(floor, value)
            turnout.append(int(round(floor)))
            
        # 2. Congestion (Tasa de Llegada / Derivada)
        # Cuantos votos nuevos entran en cada paso de tiempo
        congestion: list[int] = []
        last_val = votes[-1]
        for val in turnout:
            congestion.append(max(0, val - last_val))
            last_val = val
            
        # 3. Drop-off (Fuga de votantes)
        # Simularemos una perdida de conversion del 15% que se va acumulando
        dropoff: list[int] = [int(val * 0.15) for val in turnout]
            
        return future_t, turnout, congestion, dropoff
