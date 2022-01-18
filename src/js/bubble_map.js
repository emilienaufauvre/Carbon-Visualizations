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

    self.Country = null;
    self.Svg = null;


    const createSvg = (divName, projection) => {
        self.Svg = d3.select(divName)
            .append("svg")
                .attr("width", self.Width + self.Margin.left + self.Margin.right)
                .attr("height", self.Height + self.Margin.top + self.Margin.bottom)
            .append("g")
                .attr("transform",
                    `translate(${self.Margin.left},
                    ${self.Margin.top})`);
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

        return Object.values(dataRefined).filter(d => d.n > 0);
    }


    const printMap = async (projection) => {
        let d;
        // Load geojson world map.
        await d3.json("../res/world.geojson").then(function (data) {
            // Draw the map.
            self.Svg.append("g")
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


    self.printStackedGraph = (mode) => {
        if (self.Country) {
            // Print info on this svg.
            printCountrySelected();
            // Clear the page (the previous stacked graphs).
            d3.select("#stacked_graph").html("");
            // Print the stacked graphs. 
            StackedGraph.printStackedGraph("#stacked_graph",
                self.Country.alpha2, mode);
        }
    }


    const printBubbles = (data, size, colors) => {
        const onClick = (event, d) => {
            // Get the current mode.
            let mode = (document.getElementById("btn").style.left == "0px") ?
                StackedGraph.Modes.DATE : StackedGraph.Modes.DURATION;
            self.Country = d;
            // Print.
            self.printStackedGraph(mode)
        };

        self.Svg.selectAll("myCircles")
            .data(data.sort((a,b) => +b.n - +a.n))
            .join("circle")
                .attr("id", d => d.name)
                .attr("cx", d => projection([d.long, d.lat])[0])
                .attr("cy", d => projection([d.long, d.lat])[1])
                .attr("r", d => size(+d.n))
                .style("fill", d => colors(d.mainTransport))
                .attr("stroke", d => colors(d.mainTransport))
                .attr("stroke-Width", 1)
                .attr("fill-opacity", 0.4)
            .on("click", onClick);
    }


    const printLegend = (size) => {
        const valuesToShow = [10, 500, 2500];
        const xCircle = 100;
        const xLabel = 170;
        // The circles.
        self.Svg.selectAll("legend")
            .data(valuesToShow)
            .join("circle")
                .attr("cx", xCircle)
                .attr("cy", d => self.Height - size(d))
                .attr("r", d => size(d))
                .style("fill", "none")
                .attr("stroke", Themes.isDark() ? 
                    "#fff" : "#1b1e23")
        // The segments.
        self.Svg.selectAll("legend")
            .data(valuesToShow)
            .join("line")
                .attr('x1', d => xCircle + size(d))
                .attr('x2', xLabel)
                .attr('y1', d => self.Height - size(d))
                .attr('y2', d => self.Height - size(d))
                .attr("stroke", Themes.isDark() ?
                    "#fff" : "#1b1e23")
                .style('stroke-dasharray', ('2,2'))
        // The labels (twice to avoid bug).
        self.Svg.selectAll("legend")
            .data(valuesToShow)
            .join("text")
                .attr('x', xLabel)
                .attr('y', d => self.Height - size(d))
                .text(d => d)
                .style("font-size", 14)
                .attr('alignment-baseline', 'middle')
                .attr("stroke", Themes.isDark() ?
                    "#fff" : "#1b1e23")
        self.Svg.selectAll("legend")
            .data(valuesToShow)
            .join("text")
                .attr('x', xLabel)
                .attr('y', d => self.Height - size(d))
                .text(d => d)
                .style("font-size", 14)
                .attr('alignment-baseline', 'middle')
                .attr("stroke", Themes.isDark() ?
                    "#fff" : "#1b1e23")
    }


    const printTitle = () => {
        self.Svg.append("text")
            .style("fill", Themes.isDark() ? 
                "lightsteelblue" : "steelblue")
            .style("text-decoration-line", "underline")
            .attr("text-anchor", "middle")
            .attr("x", self.Width / 2 + self.Margin.left) 
            .attr("y", 0) 
            .attr("font-weight", "bold") 
            .html("Number of missions per country")
            .style("font-size", 34)
    }


    const printCountrySelected = () => {
        const text = self.Svg.select("text")
            .style("fill", Themes.isDark() ? 
                "lightsteelblue" : "steelblue")
            .attr("text-anchor", "end")
            .style("font-size", 18);
        // Clear.
        text.html("");
        // Write.
        text.append("tspan")
            .text(self.Country.name)
            .style("text-decoration-line", "underline")
            .style("font-size", 28)
            .attr("x", self.Width + self.Margin.left) 
            .attr("y", self.Height - 90);
        text.append("tspan")
            .text(self.Country.n + " missions")
            .attr("x", self.Width + self.Margin.left) 
            .attr("y", self.Height - 50);
        text.append("tspan")
            .text((self.Country.co2 / self.Country.n).toFixed(2) 
                + " average CO2 (per person per km)")
            .attr("x", self.Width + self.Margin.left) 
            .attr("y", self.Height - 10);
    };


    const printDefault = () => {
        d3.select("#stacked_graph")
            .text("👋   Please click on a country (circle) to print stats.")
                .style("color", Themes.isDark() ?
                    "lightsteelblue" : "steelblue")
                .style("font-size", "25px");
    };


    self.printBubbleMap = async (divName) => {
        // Get the map projection for data.
        projection = getProjection();
        // Create the map container.
        createSvg(divName, projection);
        // Print the default sentence.
        printDefault();
        // Print the world map using a geojson.
        let map = await printMap(projection);
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
            printBubbles(data, size, colors);
            // Print the bubble legend.
            printLegend(size);
            // Print the visualization title.
            printTitle();
        })
    };


    return self;
})();