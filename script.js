// Canvas-based global heatmap with scenario toggle (Robinson projection)
const width = 960, height = 500;

const container = d3.select("#map");
const svg = container.append("svg").attr("width", width).attr("height", height);
const g = svg.append("g");

const projection = d3.geoRobinson().scale(160).translate([width/2, height/2]);
const path = d3.geoPath(projection);

// Diverging color scale (blue -> white -> red). Domain in °C (tune if needed).
const color = d3.scaleDiverging(d3.interpolateRdBu).domain([8, 0, -8]); // red=hot, blue=cool

// Tooltip (if you want to enable on hover for a subset of points)
const tooltip = d3.select("body").append("div").attr("class","tooltip").style("opacity",0);

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  d3.csv("data/ssp585_temp.csv", d3.autoType) // initial
]).then(([world, initial]) => {
  const land = topojson.feature(world, world.objects.countries);

  // 1) Country outlines (SVG)
  g.append("g").selectAll("path")
    .data(land.features)
    .join("path")
    .attr("d", path)
    .attr("fill", "#f1f5f9")
    .attr("stroke", "#94a3b8")
    .attr("stroke-width", 0.5);

  // 2) Heat layer (Canvas) on top of SVG
  const canvas = container.append("canvas")
    .attr("width", width)
    .attr("height", height)
    .style("position","relative")
    .style("top", `-${height}px`); // overlap the SVG
  const ctx = canvas.node().getContext("2d");

  function drawHeat(data) {
    ctx.clearRect(0,0,width,height);
    const r = 1.3; // “pixel” size per gridpoint (adjust for your grid resolution)
    for (const d of data) {
      const p = projection([+d.lon, +d.lat]);
      if (!p) continue;
      ctx.fillStyle = color(+d.anomaly);
      ctx.fillRect(p[0]-r/2, p[1]-r/2, r, r);
    }
  }

  drawHeat(initial);
  drawLegend();

  d3.select("#scenario").on("change", function(){
    const s = this.value;
    d3.csv(`data/${s}_temp.csv`, d3.autoType).then(drawHeat);
  });
});

function drawLegend(){
  const w = 320, h = 46;
  const svgL = d3.select("#legend").append("svg").attr("width", w).attr("height", h);
  const grad = svgL.append("defs").append("linearGradient").attr("id","grad").attr("x1","0%").attr("x2","100%");
  const stops = d3.range(0,1.001,0.05).map(t => ({t, c: d3.interpolateRdBu(1-t)}));
  grad.selectAll("stop").data(stops).join("stop")
    .attr("offset", d => `${d.t*100}%`).attr("stop-color", d => d.c);
  svgL.append("rect").attr("x",20).attr("y",12).attr("width", w-40).attr("height", 12).attr("fill","url(#grad)");
  const scale = d3.scaleLinear().domain([-8,8]).range([20, w-20]);
  const axis = d3.axisBottom(scale).ticks(6).tickFormat(d => `${d}°C`);
  svgL.append("g").attr("transform", `translate(0, 24)`).call(axis);
}