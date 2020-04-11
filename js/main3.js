(function(){

//begin script when window loads
window.onload = setMap();

//pseudo-global variables
var attrArray = ["Percentage of State Businesses that are SBs", "Percentages Employed by SB", "Percentage of Small Businesses Owned by Minorities", "Number of F500 Companies", "Number of F1000 Companies"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = 600,
    chartHeight = 500,
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
        .scale(700)            //is a factor by which distances between points are multiplied, increasing or decreasing the scale of the map.
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    //var promises = [d3.json("data/FranceRegions.json")];

    var promises = [];
    promises.push(d3.json("data/BizInUSAPercentagesTopo.json")); //load choropleth spatial data
    promises.push(d3.json("data/GreatLakesTopo.json"));
    Promise.all(promises).then(callback);

    function callback(data) {
        usaData = data[0]
      	bigLakes = data[1];
        console.log(usaData);

        //translate usa TopoJSON
        var usaStates = topojson.feature(usaData, usaData.objects.BizInUSAPercentages).features,
            greatLakes = topojson.feature(bigLakes, bigLakes.objects.GreatLakes);
        //examine the results
        console.log(usaStates);
        console.log(bigLakes);

        var lakes = map.append("path")
            .datum(greatLakes)
            .attr("class", "lakes")
            .attr("d", path);

        //join csv data to GeoJSON enumeration units
        usaStates = joinData(usaStates, usaData)
        console.log(usaStates);

        var colorScale = makeColorScale(usaData)

        //add enumeration units to the map
        setEnumerationUnits(usaStates, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(usaData, colorScale);

        //create dropdown
        createDropdown(usaData);

      };

  }; //END OF SET MAP

  //Function: join data from CSV to topojson//
  function joinData(usaStates, usaData) {
      //Loop through csv to assign csv attributes to geojson region
      for (var i = 0; i < usaData.length; i++) {
          //The current region in loop index
          var usaState = usaData[i];
          //Create key for CSV file
          var usaKey = usaState.name;
          //Loop Through CSV
          for (var a = 0; a < usaStates.length; a++) {
              //Get current properties of the indexed region
              var geojsonProps = usaStates[a].properties;
              //Get the name of the indexed region
              var geojsonKey = geojsonProps.name
              //If the keys match, transfer the CSV data to geojson properties object
              if (geojsonKey == usaKey) {
                  //Assign all attributes and values using each attr item in the array
                  attrArray.forEach(function (attr) {
                      //Get CSV value as float
                      var val = parseFloat(usaState[attr]);
                      //Assign attribute and change string to float to geojson properties
                      geojsonProps[attr] = val
                  });
              };
          };
      };
      return usaStates;
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
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];

    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
};

function setEnumerationUnits(usaStates, map, path, colorScale){
    //add usa states to map
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
              return "#fff";
            }
    });
};

//function to create coordinated bar chart
function setChart(usaData, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(usaData)
        .enter()
        .append("rect")
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bars " + d.name;
        })
        .attr("width", chartWidth / usaData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / usaData.length);
        })
        .attr("height", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(usaData)
        .enter()
        .append("text")
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.name;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / usaData.length;
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
        .text(expressed);
};

//function to create a dropdown menu for attribute selection
function createDropdown(){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, usaData)
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
function changeAttribute(attribute, usaData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(usaData);

    //recolor enumeration units
    var regions = d3.selectAll(".states")
        .style("fill", function(d){
            var value = d.properties[expressed];
            console.log(value);
            if(value) {
            	return colorScale(value);
            } else {
            	return "#fff";
            }
    });

    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .attr("x", function(d, i){
            return i * (chartInnerWidth / usaData.length) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //recolor bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
              return colorScale(value);
            } else {
              return "#fff";
            }
    });

    //set bar positions, heights, and colors
    // updateChart(bars, usaData.length, colorScale);

};

//function to position, size, and color bars in chart
// function updateChart(bars, n, colorScale){
//     //position bars
//     bars.attr("x", function(d, i){
//             return i * (chartInnerWidth / n) + leftPadding;
//         })
//         //size/resize bars
//         .attr("height", function(d, i){
//             return 463 - yScale(parseFloat(d[expressed]));
//         })
//         .attr("y", function(d, i){
//             return yScale(parseFloat(d[expressed])) + topBottomPadding;
//         })
//         //color/recolor bars
//         .style("fill", function(d){
//             var value = d[expressed];
//             if(value) {
//                 return colorScale(value);
//             } else {
//                 return "#ccc";
//             }
//     });
//
//     //at the bottom of updateChart()...add text to chart title
//     var chartTitle = d3.select(".chartTitle")
//         .text("Number of Variable " + expressed[3] + " in each region");
//
// };

})(); //last line of main.js
