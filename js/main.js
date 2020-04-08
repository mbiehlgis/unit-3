// TO  DO
// 1. Y-Axis Scale is Inverted for some reason
// 2. Chart is not within frame created for it
// 3. Add labels for each bar with state abbreviations
// 4. LABEL EACH BAR WITH STATE ABBREVIATIONS
// 5. CSS WONT ALLOW FOR ANY OVERLAP WHATSOEVER
// 6. ADD LAKES

(function(){

    //pseudo-global variables
    var attrArray = ["Number_of_Small_Businesses_Per_State", "Number_of_Small_Business_Employees_Per_State", "%_of_Companies_that_are_Small_Businesses", "%_of_State_Workforce_Working_for_Small_Businesses", "Number_of_Minority_Owned_Businesses", "Number_of_Fortune_500_Company_Headquarters"]; //list of attributes
    var expressed = attrArray[3]; //initial attribute


    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){

        //map frame dimensions
        var width = window.innerWidth * 0.7,
            height = 350;

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
        Promise.all(promises).then(callback);

        function callback(data){

            //otherCountries = data[0];
            usa = data[0];
            console.log(usa);
            //console.log(otherCountries)

            //place graticule on the map
            //setGraticule(map, path);

            //translate usa TopoJSON
            //var backgroundCountries = topojson.feature(otherCountries, otherCountries.objects.CanadaMexicoCuba),
            var usaStates = topojson.feature(usa, usa.objects.USAwithBusinesses).features;

            //examine the results
            console.log(usaStates);
            //console.log(backgroundCountries);

            // var backgroundCMC = map.append("path")
            //     .datum(backgroundCountries)
            //     .attr("class", "backgroundCMC")
            //     .attr("d", path);

            var colorScale = makeColorScale(usaStates)

            //add enumeration units to the map
            setEnumerationUnits(usaStates, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(usaStates, colorScale);

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
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
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
        var chartWidth = window.innerWidth * .7,
            chartHeight = 400,
            leftPadding = 75,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth,
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
                      return parseFloat(d.properties[expressed])*4;
                  })])
                  .base(5);

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
         var chartTitle = chart.append("text")
             .attr("x", 20)
             .attr("y", 40)
             .attr("class", "chartTitle")
             .text(expressed);

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };

})();
