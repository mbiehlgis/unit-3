//begin script when window loads
window.onload = setMap();

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
        .attr("d", path); //project graticule lines

    //use Promise.all to parallelize asynchronous data loading
    //var promises = [d3.json("data/FranceRegions.json")];

    var promises = [];
    promises.push(d3.json("data/FranceRegions.json")); //load choropleth spatial data
    Promise.all(promises).then(callback);

    function callback(data){
      	france = data[0];
        console.log(france);

        //translate usa TopoJSON
        var franceRegions = topojson.feature(france, france.objects.FranceRegions).features;
        //examine the results
        console.log(franceRegions);

        //add France regions to map
        var regions = map.selectAll(".regions")
            .data(franceRegions)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + d.properties.adm1_code;
            })
            .attr("d", path);

    };

};
