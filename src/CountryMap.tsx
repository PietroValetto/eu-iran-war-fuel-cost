import { useState } from "react";
import { EuMap } from "./EuMap";
import { AllData, FUEL_LABEL, Fuel, Scenario } from "./data";
import { euro, euro2, euroShort, monthYear, perLitre, signed } from "./format";

export type Metric = "currentPrice" | "priceIncrease" | "totalExtraCost" | "perHouseholdCost" | "taxRelief";
const METRICS: { key: Metric; label: string; fmt: (v: number) => string; short: (v: number) => string }[] = [
  { key: "currentPrice", label: "Current price", fmt: perLitre, short: perLitre },
  { key: "priceIncrease", label: "Price change", fmt: (v) => `${signed(v)} /L`, short: (v) => signed(v, 2) },
  { key: "totalExtraCost", label: "Total consumer cost", fmt: euro, short: euroShort },
  { key: "perHouseholdCost", label: "Household cost", fmt: euro2, short: (v) => euro(v) },
  { key: "taxRelief", label: "Tax cuts", fmt: euro, short: euroShort },
];

type Props = { data: AllData; fuel: Fuel; scenario: Scenario; onSelect: (code: string) => void };

export function CountryMap({ data, fuel, scenario, onSelect }: Props) {
  const [metric, setMetric] = useState<Metric>("totalExtraCost");
  const [hover, setHover] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const countries = data.fuels[fuel].deficit.scenarios[scenario].countries;
  const m = METRICS.find((x) => x.key === metric)!;
  const ranked = Object.entries(countries).sort((a, b) => (sortDesc ? b[1][metric] - a[1][metric] : a[1][metric] - b[1][metric]));
  const hovered = hover && countries[hover] ? hover : null;
  const name = (c: string) => data.households.areas[c]?.name ?? c;
  const euAvg = data.fuels[fuel].current.euAvg;
  const fixed = Object.entries(countries).filter(([, e]) => e.administeredPrice);

  return (
    <section className="section" id="countries">
      <p className="kicker">By country</p>
      <h2>Current {FUEL_LABEL[fuel].toLowerCase()} statistics by country</h2>
      <p className="lede">{FUEL_LABEL[fuel]}, EU average today: {perLitre(euAvg)}/litre</p>

      <div className="metric-tabs" role="tablist" aria-label="Map metric">
        {METRICS.map((x) => (
          <button key={x.key} role="tab" aria-selected={metric === x.key} className={metric === x.key ? "is-active" : ""} onClick={() => setMetric(x.key)}>
            {x.label}
          </button>
        ))}
      </div>
      <p className="hint">Click a country, or press Enter on one, for a detailed breakdown.</p>

      <div className="map-layout">
        <EuMap values={Object.fromEntries(Object.entries(countries).map(([c, e]) => [c, e[metric]]))} label={m.label}
          fmt={m.fmt} short={m.short} name={name} hover={hover} setHover={setHover} onSelect={onSelect}
          note={(c) => (countries[c]?.administeredPrice ? "fixed price" : null)} />

        <div className="rank">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Country</th>
                <th className="num">
                  <button className="sort" onClick={() => setSortDesc(!sortDesc)} aria-label={`Sort by ${m.label}`}>
                    {m.label} {sortDesc ? "↓" : "↑"}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(([c, e], i) => (
                <tr key={c} className={hovered === c ? "is-hover" : ""} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
                  <td className="muted" data-tabular>{i + 1}</td>
                  <td>
                    <button className="link" onClick={() => onSelect(c)}>{name(c)}</button>
                    {e.administeredPrice && <sup className="fn" aria-label="fixed price, see note">*</sup>}
                  </td>
                  <td className="num" data-tabular>{m.fmt(e[metric])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fixed.length > 0 && (
            <p className="table-note">
              <sup className="fn">*</sup> {fixed.map(([c]) => name(c)).join(", ")}: pump prices are fixed by the state (unchanged
              since {monthYear(fixed[0][1].administeredSince ?? "2020-06-15")}), so consumers pay nothing extra. The war's cost falls
              on public finances instead, and isn't counted in this tracker.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
