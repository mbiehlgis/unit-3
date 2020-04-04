// TO  DO
// 1. SOME DATA'S HEIGHT TAKING UP ENTIRE CHART, MAYBE TOO HIGH
// 2. CHART TITLE IS INDEXING THE TEXT CHARACTER, NOT THE ATTRIBTUTE NAME
// 3. CANT SORT CHART DATA BY HEIGHT FOR SOME REASON
// 4. RENAME CSV ATTRIBUTES TO READABLE NAMES
// 5. LABEL EACH BAR WITH STATE ABBREVIATIONS

(function(){

    //pseudo-global variables
    var attrArray = ["SBCount", "SBE_Count", "P_of_Total", "P_of_State", "MinoritySB", "F500Count"]; //list of attributes
    var expressed = attrArray[2]; //initial attribute


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
            chartHeight = 400;

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, 105]);

        //set bars for each state
        var bars = chart.selectAll(".bars")
            .data(usa)
            .enter()
            .append("rect")
            .sort(function(b, a){
                return a[expressed] - b[expressed] //NOTHING HAPPENING WITH THIS
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
             .text("Number of Variable " + expressed[5] + " in each region");
                                          // ERROR, IS TYPING OUT THE TEXT INDEX, NOT ITEM
    };

})();
