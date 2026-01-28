import { useEffect, useRef } from "react";
import { BarChart, LineChart } from "react-chartkick";
import "chartkick/chart.js";
import embed from "vega-embed";

/**
 * @typedef {import('@inconvoai/node/resources/conversations/response').ResponseCreateResponse} ResponseCreateResponse
 * @typedef {import('@inconvoai/node/resources/conversations/response').Chart} InconvoChart
 */

/**
 * @typedef {import('@inconvoai/node/resources/conversations/response').ResponseCreateResponse} ResponseCreateResponse
 * @typedef {import('@inconvoai/node/resources/conversations/response').Chart} InconvoChart
 */

const TableRenderer = ({ response }) => (
  <table>
    <caption>{response.message}</caption>
    <thead>
      <tr>
        {response.table.head.map((h, i) => (
          <th key={i}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {response.table.body.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => (
            <td key={j}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * Renders a Vega-Lite spec using vega-embed.
 * @param {{ spec: object }} props
 */
const VegaLiteRenderer = ({ spec }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !spec) return undefined;
    let view;
    containerRef.current.innerHTML = "";

    embed(containerRef.current, spec, { actions: false })
      .then((result) => {
        view = result.view;
      })
      .catch((err) => {
        console.error("Failed to render Vega-Lite chart", err);
        if (containerRef.current) {
          containerRef.current.textContent = "Unable to render chart";
        }
      });

    return () => {
      if (view) {
        view.finalize();
      } else if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [spec]);

  return <div className="vega-lite-chart" ref={containerRef} />;
};

/**
 * @param {{ response: ResponseCreateResponse }} props
 */
const ChartRenderer = ({ response }) => {
  const chart = /** @type {InconvoChart | undefined} */ (
    response.chart ?? response.spec
  );

  const parseIfJsonString = (value) => {
    if (typeof value !== "string") return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.error("Failed to parse Vega-Lite spec string", error);
      return null;
    }
  };

  const vegaLiteSpec = (() => {
    const candidates = [
      chart,
      chart?.spec,
      chart?.chart,
      parseIfJsonString(chart),
      parseIfJsonString(chart?.spec),
      parseIfJsonString(chart?.chart),
    ];

    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate === "object" &&
        typeof candidate.$schema === "string" &&
        candidate.$schema.includes("vega-lite")
      ) {
        return candidate;
      }

      if (
        candidate &&
        typeof candidate === "object" &&
        typeof candidate.data === "object" &&
        typeof candidate.encoding === "object" &&
        (candidate.mark || candidate.layer || candidate.concat)
      ) {
        // Treat well-formed Vega-Lite shapes missing $schema as Vega-Lite.
        return {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          ...candidate,
        };
      }
    }

    return null;
  })();

  if (vegaLiteSpec) {
    return (
      <div className="chart-container">
        <div>
          {response.message || vegaLiteSpec.title || vegaLiteSpec.description}
        </div>
        <VegaLiteRenderer spec={vegaLiteSpec} />
      </div>
    );
  }

  const labels = Array.isArray(chart?.data?.labels) ? chart.data.labels : [];
  const datasets = Array.isArray(chart?.data?.datasets)
    ? chart.data.datasets
    : [];

  if (!chart || !datasets.length || !labels.length) {
    return <div>No chart data</div>;
  }

  const chartData =
    datasets.length === 1
      ? labels.map((label, index) => [
          label,
          typeof datasets[0].values[index] === "number"
            ? datasets[0].values[index]
            : 0,
        ])
      : datasets.map((dataset) => ({
          name: dataset.name,
          data: labels.reduce((acc, label, index) => {
            const value = dataset.values[index];
            if (typeof value === "number") {
              acc[label] = value;
            }
            return acc;
          }, /** @type {Record<string, number>} */ ({})),
        }));

  const chartProps = {
    data: chartData,
    round: 2,
    thousands: ",",
    width: "400px",
    ...(chart.xLabel ? { xtitle: chart.xLabel } : {}),
    ...(chart.yLabel ? { ytitle: chart.yLabel } : {}),
  };

  return (
    <div className="chart-container">
      <div>{response.message || chart.title}</div>
      {chart.title && response.message && <div>{chart.title}</div>}
      {chart.type === "bar" && <BarChart {...chartProps} />}
      {chart.type === "line" && <LineChart {...chartProps} />}
      {!["bar", "line"].includes(chart.type) && (
        <div>Unsupported chart type</div>
      )}
    </div>
  );
};

/**
 * @param {{ response: Partial<ResponseCreateResponse> }} props
 */
const MessageRenderer = ({ response }) => {
  if (!response || Object.keys(response).length === 0) {
    return <div>Send a message to see a response here</div>;
  }

  switch (response.type) {
    case "text":
      return <div>{response.message}</div>;
    case "table":
      return <TableRenderer response={response} />;
    case "chart":
      return <ChartRenderer response={response} />;
    default:
      return <div>Unsupported response type</div>;
  }
};

export default MessageRenderer;
