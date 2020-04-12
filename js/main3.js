(function(){

//begin script when window loads
window.onload = setMap();

//pseudo-global variables
var attrArray = ["Percentage of State Businesses that are Small Businesses", "Percentages Employed by Small Businesses", "Percentage of Small Businesses Owned by Minorities", "Number of Fortune 500 Company Headquarters", "Number of Fortune 1000 Company Headquarters"]; //list of attributes
var expressed = attrArray[4]; //initial attribute

//chart frame dimensions
var chartWidth = 700,
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
    .domain([-2, 120]);

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 500,
        height = 500;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbersUsa() //Composite projection is fixed. Does not support .center, .rotate, .clipAngle, or .clipExtent
        .scale(670)            //is a factor by which distances between points are multiplied, increasing or decreasing the scale of the map.
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    //var promises = [d3.json("data/FranceRegions.json")];

    var promises = [];
    //Load CSV attributes
    promises.push(d3.csv('data/BusinessesByStatePercentages.csv'));
    promises.push(d3.json("data/BizInUSAPercentagesTopo.json")); //load choropleth spatial data
    promises.push(d3.json("data/GreatLakesTopo.json"));
    Promise.all(promises).then(callback);

    function callback(data) {
        csvData = data[0]
        usa = data[1]
      	bigLakes = data[2];

        //translate usa TopoJSON
        var usaStates = topojson.feature(usa, usa.objects.BizInUSAPercentages).features,
            greatLakes = topojson.feature(bigLakes, bigLakes.objects.GreatLakes);
        //examine the results

        //join csv data to GeoJSON enumeration units
        usaStates = joinData(usaStates, csvData)

        var colorScale = makeColorScale(csvData)

        //add enumeration units to the map
        setEnumerationUnits(usaStates, map, path, colorScale);

        var lakes = map.append("path")
            .datum(greatLakes)
            .attr("class", "lakes")
            .attr("d", path);

        //add coordinated visualization to the map
        setChart(csvData, colorScale);

        //create dropdown
        createDropdown(csvData);

      };

  }; //END OF SET MAP

  //Function: join data from CSV to topojson//
  function joinData(usaStates, csvData) {
      //Loop through csv to assign csv attributes to geojson region
      for (var i = 0; i < csvData.length; i++) {
          //The current region in loop index
          var usaState = csvData[i];
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
              return "#C0C0C0";
            }
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        });

    var desc = states.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
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
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.name;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight);
        // .attr("x", function(d, i){
        //     return i * (chartWidth / csvData.length);
        // })
        // .attr("height", function(d){
        //     return yScale(parseFloat(d[expressed]));
        // })
        // .attr("y", function(d){
        //     return chartHeight - yScale(parseFloat(d[expressed]));
        // })
        // .style("fill", function(d){
        //     return colorScale(d[expressed]);
        // });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
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
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) - 1;
        })
        .text(function(d){
            return d[expressed];
        });

    //below Example 2.8...create a text element for the chart title
    // var chartTitle = chart.append("text")
    //     .attr("x", 20)
    //     .attr("y", 40)
    //     .attr("class", "chartTitle")
    //     .text(expressed);

    //set bar positions, heights, and colors
    updateChart(bars, numbers, csvData.length, colorScale);

    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
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
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(value);
            } else {
            	return "#C0C0C0";
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
    bars.attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
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

    numbers.attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) - 1;
        })
        .text(function(d){
            return d[expressed];
        });

    //at the bottom of updateChart()...add text to chart title
    // var chartTitle = d3.select(".chartTitle")
    //     .text("Number of Variable " + expressed[3] + " in each region");

};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "#2c7fb8")
        .style("stroke-width", "2");
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.name)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
};

})(); //last line of main.js
