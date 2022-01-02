/**
 * Define the dimensions of the map.
 */
const MarginB = { top: 200, right: 230, bottom: 50, left: 50 };
const WidthB = 1200 - MarginB.left - MarginB.right;
const HeightB = 1100 - MarginB.top - MarginB.bottom;



const createSvgB = (projection) => {
    // Check for the longitude + latitude 
    // of where user clicks.
    const onClick = (event, d) => {
        const coord = projection.invert([
            event.pageX - MarginB.left,
            event.pageY - MarginB.top]);

        console.log(coord[0] + " " + coord[1]);

        // TODO
        // TODO
        // TODO
        // TODO open stacked graph.
        // TODO
        // TODO
        // TODO
    }

    const svg = d3.select("#bubble_map")
        .append("svg")
            .attr("width", WidthB + MarginB.left + MarginB.right)
            .attr("height", HeightB + MarginB.top + MarginB.bottom)
            .on("mouseover", onClick) 
        .append("g")
            .attr("transform",
                `translate(${MarginB.left},
                ${MarginB.top})`);

    return svg; 
}


const getProjection = () => {
    return d3.geoMercator()
        .center([0, 0])
        .scale(120)
        .translate([(WidthB + MarginB.left + MarginB.right) / 2, 
            (HeightB + MarginB.top + MarginB.bottom) / 2]);
}


const getBubbleColors = (data) => {
    return d3.scaleOrdinal()
        .domain(data.map(d => d.continent))
        .range(d3.schemePaired);
}


const getBubbleSize = (data) => {
    const valueExtent = d3.extent(data, d => +d.n)
    return d3.scaleSqrt()
        .domain(valueExtent)  
        .range([1, 50]);  
}


const extractCoordinatesB = (data) => {
    // TODO
    // TODO
    // TODO
    // TODO extract data.
    // TODO
    // TODO
    // TODO
    return [
            { long: 9.083, lat: 42.149, n: 1, continent: "EU"}, // corsica
            { long: 7.26, lat: 43.71, n: 100, continent: "AM" }, // nice
            { long: 2.349, lat: 48.864, n: 10, continent: "E"}, // Paris
            { long: -1.397, lat: 43.664, n: 50, continent: "2" }, // Hossegor
            { long: 3.075, lat: 50.640, n: 30, continent: "U" }, // Lille
            { long: -3.83, lat: 58, n: 3, continent: "e" }, // Morlaix
        ];
}


const printMap = (svg, projection) => {
    // Load geojson world map.
    d3.json("../res/world.geojson").then(function (data) {
        // Draw the map.
        svg.append("g")
            .selectAll("path")
            .data(data.features)
            .join("path")
                .attr("fill", "#b8b8b8")
                .attr("d", d3.geoPath().projection(projection))
                .style("stroke", Theme == Themes.DARK ? "white" : "black")
                .style("opacity", .3);
    })
}


const printBubbles = (svg, data, size, colors) => {
    svg.selectAll("myCircles")
        .data(data.sort((a,b) => +b.n - +a.n))
        .join("circle")
            .attr("cx", d => projection([d.long, d.lat])[0])
            .attr("cy", d => projection([d.long, d.lat])[1])
            .attr("r", d => size(+d.n))
            .style("fill", d => colors(d.continent))
            .attr("stroke", "#69b3a2")
            .attr("stroke-WidthB", 1)
            .attr("fill-opacity", .4);
}


const printLegendB = (svg, size) => {
    // TODO
    // TODO
    // TODO
    // TODO check the values To show.
    // TODO
    // TODO
    // TODO
    // TODO
    const valuesToShow = [10, 50, 100]
    const xCircle = 40
    const xLabel = 90
    // The circles.
    svg.selectAll("legend")
        .data(valuesToShow)
        .join("circle")
            .attr("cx", xCircle)
            .attr("cy", d => HeightB - size(d))
            .attr("r", d => size(d))
            .style("fill", "none")
            .attr("stroke", Theme == Themes.DARK ?
                "#fff" : "#1b1e23")
    // The segments.
    svg.selectAll("legend")
        .data(valuesToShow)
        .join("line")
            .attr('x1', d => xCircle + size(d))
            .attr('x2', xLabel)
            .attr('y1', d => HeightB - size(d))
            .attr('y2', d => HeightB - size(d))
            .attr("stroke", Theme == Themes.DARK ?
                "#fff" : "#1b1e23")
            .style('stroke-dasharray', ('2,2'))
    // The labels.
    svg.selectAll("legend")
        .data(valuesToShow)
        .join("text")
            .attr('x', xLabel)
            .attr('y', d => HeightB - size(d))
            .text(d => d)
            .style("font-size", 10)
            .attr('alignment-baseline', 'middle')
            .attr("stroke", Theme == Themes.DARK ?
                "#fff" : "#1b1e23")
}


const printTitle = (svg) => {
    svg.append("text")
        .style("fill", Theme == Themes.DARK ? 
            "lightsteelblue" : "steelblue")
        .attr("text-anchor", "middle")
        .attr("x", WidthB / 2 + MarginB.left) 
        .attr("y", 0) 
        .html("Carbon emmisions by work travels for a research lab.")
        .style("font-size", 24)
}


const printBubbleMap = () => {
    // Get the map projection for data.
    projection = getProjection();
    // Create the map container.
    const svg = createSvgB(projection);
    // Print the world map using a geojson.
    printMap(svg, projection);
    // Parse data and print bubbles. 
    d3.tsv("../data/missions.tsv", d => (
        {
            missionId: d['#mission_id'],
            userId: d.user_id,
            placeId: +d.place_id,
            date: d3.timeParse("%Y-%m-%d")(d.date),
            duration: +d.duration,
            modeTransport: d.mode,
            co2: +d.co2,
        }
    )).then(async data => {
        // Map the data to countries with global stats.
        data = extractCoordinatesB(data);
        // Get the color of the bubbles.
        colors = getBubbleColors(data);
        // Get the size transformation of the bubbles, in pixel.
        size = getBubbleSize(data);
        // Print the bubble for each data.
        printBubbles(svg, data, size, colors);
        // Print the bubble legend.
        printLegendB(svg, size);
        // Print the visualization title.
        printTitle(svg);
    })
};