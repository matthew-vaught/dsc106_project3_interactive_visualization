const width = 900, height = 450;

const svg = d3.select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoRobinson().scale(150).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

// Color scale
const colorScale = d3.scaleSequential(d3.interpolateRdBu)
  .domain([6, -6]);  // reversed for red=hot, blue=cool

// Load world map + data
Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  d3.csv("data/ssp585_temp.csv")
]).then(([world, data]) => {
  const countries = topojson.feature(world, world.objects.countries);

  drawMap(countries, data);

  // Scenario dropdown listener
  d3.select("#scenario-select").on("change", function() {
    const scenario = this.value;
    d3.csv(`data/${scenario}_temp.csv`).then(newData => {
      updateMap(newData);
    });
  });
});

function drawMap(countries, data) {
  svg.append("g")
    .selectAll("path")
    .data(countries.features)
    .join("path")
    .attr("d", path)
    .attr("fill", "#eee")
    .attr("stroke", "#999");

  svg.append("g")
    .attr("class", "temp-layer")
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => projection([+d.lon, +d.lat])[0])
    .attr("cy", d => projection([+d.lon, +d.lat])[1])
    .attr("r", 1.2)
    .attr("fill", d => colorScale(+d.anomaly))
    .attr("opacity", 0.8)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(`Lat: ${d.lat}<br>Lon: ${d.lon}<br>ΔT: ${(+d.anomaly).toFixed(2)} °C`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

  drawLegend();
}

function updateMap(newData) {
  svg.select(".temp-layer")
    .selectAll("circle")
    .data(newData)
    .join("circle")
    .attr("cx", d => projection([+d.lon, +d.lat])[0])
    .attr("cy", d => projection([+d.lon, +d.lat])[1])
    .attr("r", 1.2)
    .attr("fill", d => colorScale(+d.anomaly))
    .attr("opacity", 0.8);
}

function drawLegend() {
  const legendWidth = 250, legendHeight = 12;
  const legendSvg = d3.select("#legend")
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", 40);

  const gradient = legendSvg.append("defs")
    .append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%").attr("x2", "100%");

  const stops = d3.range(-6, 6.1, 1).map(v => ({
    offset: ((v + 6) / 12) * 100 + "%",
    color: colorScale(v)
  }));

  gradient.selectAll("stop")
    .data(stops)
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  legendSvg.append("rect")
    .attr("x", 0)
    .attr("y", 10)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  const scale = d3.scaleLinear().domain([-6, 6]).range([0, legendWidth]);
  const axis = d3.axisBottom(scale).ticks(6).tickFormat(d => `${d}°C`);

  legendSvg.append("g")
    .attr("transform", "translate(0, 22)")
    .call(axis);
}