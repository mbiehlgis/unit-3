(function(){

//begin script when window loads
window.onload = setMap();

//pseudo-global variables
var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * 0.5,
    chartHeight = 550,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
    .range([0, chartHeight])
    .domain([0, 105]);

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.4,
        height = 550;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 46.2])      //specifies the [longitude, latitude] coordinates of the center of the developable surface.

        .rotate([-2, 0, 0])     //specifies the [longitude, latitude, and roll] angles by which to rotate the reference globe

        .parallels([43, 62])    // specifies the two standard parallels of a conic projection. If the two array values are the same,
                                //the projection is a tangent case (the plane intersects the globe at one line of latitude);
                                //if they are different, it is a secant case (the plane intersects the globe at two lines of latitude, slicing through it).

        .scale(2500)            //is a factor by which distances between points are multiplied, increasing or decreasing the scale of the map.

        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    //var promises = [d3.json("data/FranceRegions.json")];

    var promises = [];
    promises.push(d3.csv("data/unitsData.csv")); //load attributes from csv
    promises.push(d3.json("data/FranceRegions.json")); //load choropleth spatial data
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0]
      	france = data[1];
        console.log(france);

        //place graticule on the map
        setGraticule(map, path);

        //translate usa TopoJSON
        var franceRegions = topojson.feature(france, france.objects.FranceRegions).features;
        //examine the results
        console.log(franceRegions);

        //join csv data to GeoJSON enumeration units
        franceRegions = joinData(franceRegions, csvData);
        console.log(franceRegions);

        var colorScale = makeColorScale(csvData)

        //add enumeration units to the map
        setEnumerationUnits(franceRegions, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(csvData, colorScale);

        //create dropdown
        createDropdown(csvData);

      };

  }; //END OF SET MAP


function setGraticule(map, path){
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

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


function joinData(franceRegions, csvData){
    //variables for data join
    var attrArray = ["varA", "varB", "varC", "varD", "varE"];

    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.adm1_code; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<franceRegions.length; a++){

            var geojsonProps = franceRegions[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.adm1_code; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return franceRegions;
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
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];

    //assign two-value array as scale domain
    colorScale.domain(minmax);
    console.log(colorScale);

    return colorScale;
};

function setEnumerationUnits(franceRegions, map, path, colorScale){
    //add France regions to map
    var regions = map.selectAll(".regions")
        .data(franceRegions)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.adm1_code;
        })
        .attr("d", path)
        .style("fill", function(d){
            return colorScale(d.properties[expressed]);
        });
      return franceRegions;
    };

//function to create coordinated bar chart
function setChart(csvData, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.adm1_code;
        })
        .attr("width", chartInnerWidth / csvData.length - 1);

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.adm1_code;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });

    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed + " in each region");

    updateChart(bars, numbers, csvData.length, colorScale);

};

//function to create a dropdown menu for attribute selection
function createDropdown(){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
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
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var regions = d3.selectAll(".regions")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(value);
            } else {
            	return "#ccc";
            }
    });

    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(1000);

    var numbers = d3.selectAll(".numbers")
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(1000);

    //set bar positions, heights, and colors
    updateChart(bars, numbers, csvData.length, colorScale);

};

//function to position, size, and color bars in chart
function updateChart(bars, numbers, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });

    numbers.attr("text-anchor", "middle")
           .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
           .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
           .text(function(d){
                return d[expressed];
            });

    //at the bottom of updateChart()...add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text("Number of Variable " + expressed[3] + " in each region");

};

})(); //last line of main.js
