let BubbleMap = (() => {
    /**
     * Define the public elements.
     */
    let self = {};

    /**
     * Define the dimensions of the map.
     */
    self.Margin = { top: 60, right: 50, bottom: 50, left: 50 };
    self.Width = 900 - self.Margin.left - self.Margin.right;
    self.Height = 900 - self.Margin.top - self.Margin.bottom;


    const createSvg = (divName, projection) => {
        const svg = d3.select(divName)
            .append("svg")
                .attr("width", self.Width + self.Margin.left + self.Margin.right)
                .attr("height", self.Height + self.Margin.top + self.Margin.bottom)
            .append("g")
                .attr("transform",
                    `translate(${self.Margin.left},
                    ${self.Margin.top})`);

        return svg; 
    }

    
    const getProjection = () => {
        return d3.geoMercator()
            .center([0, 0])
            .scale(120)
            .translate([(self.Width + self.Margin.left + self.Margin.right) / 2, 
                (self.Height + self.Margin.top + self.Margin.bottom) / 2]);
    }


    const getBubbleColors = (data) => {
        const modesTransports = d3.map(data, d => d.modeTransport);
        // Eliminate duplicates.
        const keys = [... new Set(modesTransports)];
        // Associate a color with each key. 
        return colors = d3.scaleOrdinal()
            .domain(keys)
            .range(d3.schemeCategory10);
    }


    const getBubbleSize = (data) => {
        const valueExtent = d3.extent(data, d => +d.n)
        return d3.scaleSqrt()
            .domain(valueExtent)  
            .range([2, 75]);  
    }


    const extractCoordinates = async (data, map) => {
        let dataRefined = {};

        // Extract each country.
        map.features.forEach(c => {
            let country = {};
            let coord;
            // Get the centroid of the country.
            if (typeof c.geometry.coordinates[0][0][0] === "number") {
                coord = c.geometry.coordinates[0].reduce(
                    (a, b) => [a[0] + b[0], a[1] + b[1]]);
                    coord[0] /= c.geometry.coordinates[0].length;
                    coord[1] /= c.geometry.coordinates[0].length;
            }
            else {
                coord = c.geometry.coordinates.at(-1)[0].reduce(
                    (a, b) => [a[0] + b[0], a[1] + b[1]]);
                    coord[0] /= c.geometry.coordinates.at(-1)[0].length;
                    coord[1] /= c.geometry.coordinates.at(-1)[0].length;
            }
            // Fill it with properties.
            country.name = c.properties.name;
            country.continent = "";
            country.lat = coord[1];
            country.long = coord[0];
            country.n = 0;
            country.co2 = 0;
            country.transports = {};
            country.transports.car = 0;
            country.transports.other = 0;
            country.transports.train = 0;
            country.transports.plane = 0;
            country.transports.public = 0;
            
            dataRefined[country.name] = country;
        });

        let places = await Data.getPlacesData();
        let countries = await Data.getCountriesData();

        // Fill data of each country.
        data.forEach(d => { 
            let place = places.filter(p => p.placeId == d.placeId)
            let country = countries.filter(c => c.alpha2 == place[0].alpha2);
            let concerned = dataRefined[country[0].country];   

            if (concerned) {
                concerned.n++;
                concerned.continent = country[0].continent;
                concerned.alpha2 = country[0].alpha2;
                concerned.co2 += d.co2;
                concerned.transports[d.modeTransport] ++;
            }
        });

        // Extract main transport.
        for (var country in dataRefined) {
            let max = 0;
            let mainTransport = "other";

            for (var transport in dataRefined[country].transports) {
                let val = dataRefined[country].transports[transport];

                if (max < val) {
                    max = val;
                    mainTransport = transport;
                }
            }

            dataRefined[country].mainTransport = mainTransport;
        }

        console.log(dataRefined);
        return Object.values(dataRefined).filter(d => d.n > 0);
    }


    const printMap = async (svg, projection) => {
        let d;
        // Load geojson world map.
        await d3.json("../res/world.geojson").then(function (data) {
            // Draw the map.
            svg.append("g")
                .selectAll("path")
                .data(data.features)
                .join("path")
                    .attr("fill", "#b8b8b8")
                    .attr("d", d3.geoPath()
                        .projection(projection))
                    .style("stroke", Themes.isDark() ? 
                        "white" : "black")
                    .style("opacity", .3);

            d = data;
        })

        return d;
    }


    const printBubbles = (svg, data, size, colors) => {
        const onClick = (event, d) => {
            // Print info on this svg.
            printCountrySelected(svg, d); 
            // Clear the page (the previous stacked graphs).
            d3.select("#stacked_graph_1").html("");
            d3.select("#stacked_graph_2").html("");
            // Print the stacked graphs. 
            StackedGraph.printStackedGraph("#stacked_graph_1", 
                d.alpha2, StackedGraph.Modes.DATE);
            StackedGraph.printStackedGraph("#stacked_graph_2", 
                d.alpha2, StackedGraph.Modes.DURATION);
        };

        svg.selectAll("myCircles")
            .data(data.sort((a,b) => +b.n - +a.n))
            .join("circle")
                .attr("cx", d => projection([d.long, d.lat])[0])
                .attr("cy", d => projection([d.long, d.lat])[1])
                .attr("r", d => size(+d.n))
                .style("fill", d => colors(d.mainTransport))
                .attr("stroke", d => colors(d.mainTransport))
                .attr("stroke-Width", 1)
                .attr("fill-opacity", 0.4)
            .on("click", onClick);
    }


    const printLegend = (svg, size) => {
        const valuesToShow = [10, 500, 2500];
        const xCircle = 140;
        const xLabel = 220;
        // The circles.
        svg.selectAll("legend")
            .data(valuesToShow)
            .join("circle")
                .attr("cx", xCircle)
                .attr("cy", d => self.Height - size(d))
                .attr("r", d => size(d))
                .style("fill", "none")
                .attr("stroke", Themes.isDark() ? 
                    "#fff" : "#1b1e23")
        // The segments.
        svg.selectAll("legend")
            .data(valuesToShow)
            .join("line")
                .attr('x1', d => xCircle + size(d))
                .attr('x2', xLabel)
                .attr('y1', d => self.Height - size(d))
                .attr('y2', d => self.Height - size(d))
                .attr("stroke", Themes.isDark() ?
                    "#fff" : "#1b1e23")
                .style('stroke-dasharray', ('2,2'))
        // The labels.
        svg.selectAll("legend")
            .data(valuesToShow)
            .join("text")
                .attr('x', xLabel)
                .attr('y', d => self.Height - size(d))
                .text(d => d)
                .style("font-size", 10)
                .attr('alignment-baseline', 'middle')
                .attr("stroke", Themes.isDark() ?
                    "#fff" : "#1b1e23")
    }


    const printTitle = (svg) => {
        svg.append("text")
            .style("fill", Themes.isDark() ? 
                "lightsteelblue" : "steelblue")
            .attr("text-anchor", "middle")
            .attr("x", self.Width / 2 + self.Margin.left) 
            .attr("y", 0) 
            .attr("font-weight", "bold") 
            .html("Number of missions per country")
            .style("font-size", 34)
    }


    const printCountrySelected = (svg, country) => {
        const text = svg.select("text")
            .style("fill", Themes.isDark() ? 
                "lightsteelblue" : "steelblue")
            .attr("text-anchor", "end")
            .style("font-size", 20);
        // Clear.
        text.html("");
        // Write.
        text.append("tspan")
            .text(country.name)
            .attr("x", self.Width + self.Margin.left) 
            .attr("y", self.Height - 90);
        text.append("tspan")
            .text(country.n + " missions")
            .attr("x", self.Width + self.Margin.left) 
            .attr("y", self.Height - 50);
        text.append("tspan")
            .text((country.co2 / country.n).toFixed(2) 
                + " average CO2 (per person per km)")
            .attr("x", self.Width + self.Margin.left) 
            .attr("y", self.Height - 10);
    };


    const printDefault = (svg) => {
        d3.select("#stacked_graph_1")
            .append("p")
                .html("👋<br><br>Please click<br>on a country (circle)<br>to print stats.")
                    .style("color", Themes.isDark() ?
                        "lightsteelblue" : "steelblue")
                    .style("font-size", "25px");
    };


    self.printBubbleMap = async (divName) => {
        // Get the map projection for data.
        projection = getProjection();
        // Create the map container.
        const svg = createSvg(divName, projection);
        // Print the default sentence.
        printDefault(svg);
        // Print the world map using a geojson.
        let map = await printMap(svg, projection);
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
            // Get the color of the bubbles.
            colors = getBubbleColors(data);
            // Map the data to countries with global stats.
            data = await extractCoordinates(data, map);
            // Get the size transformation of the bubbles, in pixel.
            size = getBubbleSize(data);
            // Print the bubble for each data.
            printBubbles(svg, data, size, colors);
            // Print the bubble legend.
            printLegend(svg, size);
            // Print the visualization title.
            printTitle(svg);
        })
    };


    return self;
})();