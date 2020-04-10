// TO  DO
// 1. Y-Axis Scale is Inverted for some reason
// 2. Chart is not within frame created for it
// 3. Add labels for each bar with state abbreviations
// 4. SVG for Chart cannot be moved with html
// 5. Lakes are behind States

(function(){

    //pseudo-global variables
    var attrArray = ["Number of Small Businesses Per State", "Number of Small Business Employees Per State", "% of Companies that are Small Businesses", "% of State Workforce Working for Small Businesses", "Number of Minority Owned Businesses", "Number of Fortune 500 Company Headquarters"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute


    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        //var width = window.innerWidth * 0.7, --> USE IF I WANT MAP AND CHART STACKED
        var width = 600,
            height = 500;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbersUsa() //Composite projection is fixed. Does not support .center, .rotate, .clipAngle, or .clipExtent

            //.center([0, 46.2])      //specifies the [longitude, latitude] coordinates of the center of the developable surface.

            //.rotate([-2, 0, 0])     //specifies the [longitude, latitude, and roll] angles by which to rotate the reference globe

            //.parallels([55, 65])    // specifies the two standard parallels of a conic projection. If the two array values are the same,
                                    //the projection is a tangent case (the plane intersects the globe at one line of latitude);
                                    //if they are different, it is a secant case (the plane intersects the globe at two lines of latitude, slicing through it).

            .scale(700)            //is a factor by which distances between points are multiplied, increasing or decreasing the scale of the map.

            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        //var promises = [d3.json("data/BizInUSATopo.json")];
        var promises = [];
        //promises.push(d3.csv("data/BusinessesByState.csv"));
        promises.push(d3.json("data/BizInUSATopo.json")); //load choropleth spatial data
        promises.push(d3.json("data/GreatLakesTopo.json"));
        Promise.all(promises).then(callback);

        function callback(data){
            //otherCountries = data[0];
            usa = data[0];
            bigLakes = data[1];
            console.log(usa);
            //console.log(otherCountries)

            //place graticule on the map
            //setGraticule(map, path);

            //translate usa TopoJSON
            //var backgroundCountries = topojson.feature(otherCountries, otherCountries.objects.CanadaMexicoCuba),
            var usaStates = topojson.feature(usa, usa.objects.USAwithBusinesses).features;
            var greatLakes = topojson.feature(bigLakes, bigLakes.objects.GreatLakes);
            console.log(greatLakes);

            var lakes = map.append("path")
                .datum(greatLakes)
                .attr("class", "lakes")
                .attr("d", path);

            // var backgroundCMC = map.append("path")
            //     .datum(backgroundCountries)
            //     .attr("class", "backgroundCMC")
            //     .attr("d", path);

            var colorScale = makeColorScale(usaStates)

            //add enumeration units to the map
            setEnumerationUnits(usaStates, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(usaStates, colorScale);

            createDropdown(usaStates);

        };

      };

    function setGraticule(map, path){
        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([7, 7]); //place graticule lines every 5 degrees of longitude and latitude
            //.extent([180, -90]);

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines};

        };

    //Example 1.4 line 11...function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#EDF8FB",
            "#b2e2e2",
            "#66c2a4",
            "#2ca25f",
            "#006d2c"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d.properties[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d.properties[expressed]); })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);

        return colorScale;
    };

    function setEnumerationUnits(usaStates, map, path, colorScale){
        //add states to map
        var states = map.selectAll(".states")
            .data(usaStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.name;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                	return colorScale(d.properties[expressed]);
                } else {
                	return "#ccc";
                }
        });
    };

    //function to create coordinated bar chart
    function setChart(usa, colorScale){
        //chart frame dimensions
        var chartWidth = 600,
            chartHeight = 500,
            leftPadding = 60, //CONTROLS AXIS PLACEMENT
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 1.2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        var yScale = d3.scaleLog()
            .range([0, chartHeight])
            .domain([d3.min(usa, function (d) {
                return parseFloat(d.properties[expressed])
            }),
            d3.max(usa, function (d) {
                return parseFloat(d.properties[expressed])*1.03;
            })])
            .base(5);

        // var yScale = d3.scaleLinear()
        //     .range([0, chartHeight])
        //     .domain([0, 100]);

        //set bars for each state
        var bars = chart.selectAll(".bars")
            .data(usa)
            .enter()
            .append("rect")
            .sort(function(b, a){
                return a.properties[expressed] - b.properties[expressed] //NOTHING HAPPENING WITH THIS
             })
            .attr("class", function(d){
                return "bars " + d.properties.name;
             })
            .attr("width", chartWidth / usa.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / usa.length);
             })
             .attr("height", function(d){
                return yScale(parseFloat(d.properties[expressed]));
             })
             .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d.properties[expressed]));
             })
             .style("fill", function(d){
                return colorScale(d.properties[expressed]);
             });

         //below Example 2.8...create a text element for the chart title
         // var chartTitle = chart.append("text")
         //     .attr("x", 20)
         //     .attr("y", 40)
         //     .attr("class", "chartTitle")
         //     .text(expressed);

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        // //create frame for chart border
        // var chartFrame = chart.append("rect")
        //     .attr("class", "chartFrame")
        //     .attr("width", chartInnerWidth)
        //     .attr("height", chartInnerHeight)
        //     .attr("transform", translate);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, usa)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d })
            .style("font-family", "Quicksand");
    };

    //dropdown change listener handler
    function changeAttribute(attribute, usaStates){
        //change the expressed attribute
        expressed = attribute;
        console.log(expressed);

        //recreate the color scale
        var colorScale = makeColorScale(usaStates);

        //recolor enumeration units
        var states = d3.selectAll(".states")
            .style("fill", function(d){
                var value = d.properties[expressed];
                console.log(value);
                if(value) {
                	return colorScale(value);
                } else {
                	return "#ccc";
                }
    });

        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(b, a){
                return a.properties[expressed] - b.properties[expressed];
            })
            .attr("x", function(d, i){
                return i * (chartInnerWidth / usa.length) + leftPadding;
            })
            //resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d.properties[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d.properties[expressed])) + topBottomPadding;
            })
            //recolor bars
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                	return colorScale(value);
                } else {
                	return "#ccc";
                }
    });
};

})();
