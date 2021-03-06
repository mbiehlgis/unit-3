// TO DO
// 1. Natural Jenks showing 0 values as null data

(function(){

//begin script when window loads
window.onload = setMap();

//pseudo-global variables
var attrArray = ["Percentage Employed by Small Businesses", "Percentage of State Businesses that are Small Businesses", "Percentage of Small Businesses Owned by Minorities", "Number of Fortune 500 Company Headquarters", "Number of Fortune 1000 Company Headquarters"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = 700,
    chartHeight = 500,
    leftPadding = 2,
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
    var map = d3.select("div.mainContainer")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create custom d3 albers projection specific for the US
    var projection = d3.geoAlbersUsa()
        .scale(670)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    var promises = [];
    promises.push(d3.csv('data/BusinessesByStatePercentages.csv')); //Load CSV attributes
    promises.push(d3.json("data/BizInUSAPercentagesTopo.json"));    //load choropleth spatial data
    promises.push(d3.json("data/GreatLakesTopo.json"));             //loads great lakes layers
    Promise.all(promises).then(callback);

    function callback(data) {
        csvData = data[0]
        usa = data[1]
      	bigLakes = data[2];

        //translate usa and lakes TopoJSON
        var usaStates = topojson.feature(usa, usa.objects.BizInUSAPercentages).features,
            greatLakes = topojson.feature(bigLakes, bigLakes.objects.GreatLakes);

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


//Function to join CSV and JSON Data
function joinData(usaStates, csvData) {

    //Loop through csv to assign csv attributes to geojson region
    for (var i = 0; i < csvData.length; i++) {

        var usaState = csvData[i];  //THE CURRENT REGION
        var usaKey = usaState.name; //CSV PRIMARY KEY

        //Loop Through JSON regions to detect correct region
        for (var a = 0; a < usaStates.length; a++) {

            var geojsonProps = usaStates[a].properties;  //Current Region JSON Properties
            var geojsonKey = geojsonProps.name //geoJSON primary key

            //If the JSON key matches the CSV key, the CSV data is appended to the JSON
            if (geojsonKey == usaKey) {

                //Assign all attributes and values
                attrArray.forEach(function (attr) {
                    var val = parseFloat(usaState[attr]); //Get CSV value as float
                    geojsonProps[attr] = val              //Assign attribute and change string to float to geojson properties

                });
            };
        };
    };
    return usaStates;
};

//function to create color scale generator
function makeColorScale(data){
// GREEN COLOR SCALE
    // var colorClasses = [
    //     "#EDF8FB",
    //     "#b2e2e2",
    //     "#66c2a4",
    //     "#2ca25f",
    //     "#006d2c"
    // ];

// LIGHT BLUE COLOR SCALE
    // var colorClasses = [
    //     "#eff3ff",
    //     "#bdd7e7",
    //     "#6baed6",
    //     "#3182bd",
    //     "#08519c"
    // ];

// DARK BLUE COLOR SCALE
    var colorClasses = [
        "#f1eef6",
        "#bdc9e1",
        "#74a9cf",
        "#2b8cbe",
        "#045a8d"
    ];

    //               // EQUAL INTERVAL SCALE
    // //create color scale generator
    // var colorScale = d3.scaleQuantile()
    //     .range(colorClasses);
    //
    // //build two-value array of minimum and maximum expressed attribute values
    // var minmax = [
    //     d3.min(data, function(d) { return parseFloat(d[expressed]); }),
    //     d3.max(data, function(d) { return parseFloat(d[expressed]); })
    // ];
    //
    // //assign two-value array as scale domain
    // colorScale.domain(minmax);
    //
    // return colorScale;

                  // NATURAL BREAKS SCALE
    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

function setEnumerationUnits(usaStates, map, path, colorScale){

    //add states to map
    var states = map.selectAll(".states")
        .data(usaStates)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "states " + d.properties.name.replace(/\s+/g, '');
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
              return colorScale(d.properties[expressed]);
            } else {
              return "#696969";
            }
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    //dehighlight for stroke
    var desc = states.append("desc")
        .text('{"stroke": "#000", "stroke-width": ".5px"}');

    //alternate dehighlight for fill
    // var desc = states.append("desc")
    //     .text('{"fill": "blue"}');

};

//function to create coordinated bar chart
function setChart(csvData, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("div.mainContainer")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //set bars for each state
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.name.replace(/\s+/g, '')
        })
        .attr("width", chartWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    //Annotates bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(b, a){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers";
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

    var chartTitle = chart.append("text")
        .attr("x", 15)
        .attr("y", 21)
        .attr("class", "chartTitle")
        .text(expressed);

    //set bar positions, heights, and colors
    updateChart(bars, numbers, csvData.length, colorScale);

    // dehighlight for stroke
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "none"}');

    // alternate dehighlight for fill
    // var desc = states.append("desc")
    //     .text('{"fill": "blue"}');

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
        .duration(1500)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(value);
            } else {
            	return "#696969";
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


    var chartTitle = d3.select(".chartTitle")
        .text(expressed);

};

//function to highlight enumeration units and bars
function highlight(props){

                //change STROKE highlight method
    var selected = d3.selectAll("." + props.name.replace(/\s+/g, ''))
        .style("stroke", "#ffffcc") //highlight color
        .style("stroke-width", "3px"); //highlight width

                // change FILL highlight method
    // var selected = d3.selectAll("." + props.name.replace(/\s+/g, ''))
    //     .style("fill", "#ffffcc") //highlight color

    //Call setlabel to create dynamic label
    setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
                        // STROKE DEHIGHLIGHT
    var selected = d3.selectAll("." + props.name.replace(/\s+/g, ''))
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

    //                     //FILL DEHIGHLIGHT
    // var selected = d3.selectAll("." + props.name.replace(/\s+/g, ''))
    //     .style("fill", function(){
    //         return getStyle(this, "fill")
    //     });
    //
    // function getStyle(element, styleName){
    //     var styleText = d3.select(element)
    //         .select("desc")
    //         .text();
    //
    //     var styleObject = JSON.parse(styleText);
    //
    //     //console.log(styleObject[styleName])
    //
    //     return styleObject[styleName];
    //     };


    d3.select(".infolabel")
        .remove();
};

//function to create dynamic label
function setLabel(props){

    //Choosing text that appears in label
    var labelAttribute = "<center><h1>" + props[expressed] + "</h1></center>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.name.replace(/\s+/g, '') + "_label")
        .html(labelAttribute);

    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);

};

function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})();
