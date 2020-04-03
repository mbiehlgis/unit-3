(function(){

//begin script when window loads
window.onload = setMap();

//pseudo-global variables
var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 1250,
        height = 650;

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

        var colorScale = makeColorScale(csvData)

        //add enumeration units to the map
        setEnumerationUnits(franceRegions, map, path, colorScale);

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

})(); //last line of main.js
