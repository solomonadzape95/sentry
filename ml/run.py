from __future__ import annotations

import argparse
import time

from aisec.config import FORECAST_HORIZON, HISTORY_DAYS, TODAY
from aisec.export import export_all, scenario_summary
from aisec.generate import build_disease, demand_frame, finalize_inventory, simulate_inventory
from aisec.model import forecast_all
from aisec.weather import add_weather_features, load_weather


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the Aisec demonstration dataset and forecasts")
    parser.add_argument("--skip-export", action="store_true")
    args = parser.parse_args()

    started = time.time()
    print(f"Aisec data pipeline — demo date {TODAY}, {HISTORY_DAYS} days, {FORECAST_HORIZON}-day horizon")

    print("\n[1/5] Weather")
    weather_raw = load_weather()
    weather = add_weather_features(weather_raw)

    print("\n[2/5] Disease signals")
    disease = build_disease(weather)
    print(f"  {len(disease)} weeks of illustrative FCT indicators")

    print("\n[3/5] Demand and inventory simulation")
    demand = demand_frame(weather, disease)
    obs, batches, movements = simulate_inventory(demand)
    stockout_rate = float(obs["was_stockout"].mean())
    print(f"  {len(obs):,} facility/medicine/day observations; {stockout_rate:.1%} stockout days")

    print("\n[4/5] Forecast training and backtesting")
    forecasts, model_runs, demand_map = forecast_all(obs, weather, disease)

    print("\n[5/5] Scenario reconciliation and export")
    batches, movements, purchases = finalize_inventory(batches, movements, demand_map)
    summary = scenario_summary(batches, demand_map)
    print(f"  hero stock: {summary['heroUsableUnits']} units, stockout in {summary['heroDaysToStockout']} days")
    print(f"  surplus available: {summary['surplusAvailable']} units at {summary['surplusFacilityId']}")
    print(f"  after {summary['recommendedTransferUnits']}-unit transfer: {summary['daysToStockoutAfterTransfer']} days")

    if not args.skip_export:
        export_all(obs, batches, movements, purchases, weather_raw, disease, forecasts, model_runs, demand_map, summary)

    print(f"\nDone in {time.time() - started:.1f}s")


if __name__ == "__main__":
    main()
