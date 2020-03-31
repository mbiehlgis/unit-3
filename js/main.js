//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 500;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbersUSA() //Composite projection is fixed. Does not support .center, .rotate, .clipAngle, or .clipExtent

        .center([0, 46.2])      //specifies the [longitude, latitude] coordinates of the center of the developable surface.

        .rotate([-2, 0, 0])     //specifies the [longitude, latitude, and roll] angles by which to rotate the reference globe

        .parallels([55, 65])    // specifies the two standard parallels of a conic projection. If the two array values are the same,
                                //the projection is a tangent case (the plane intersects the globe at one line of latitude);
                                //if they are different, it is a secant case (the plane intersects the globe at two lines of latitude, slicing through it).

        .scale(1070)            //is a factor by which distances between points are multiplied, increasing or decreasing the scale of the map.

        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    //var promises = [d3.json("data/BizInUSATopo.json")];
    var promises = [];
    promises.push(d3.json("data/BizInUSATopo.json")); //load choropleth spatial data
    Promise.all(promises).then(callback);

    function callback(data){

      	usa = data[0];
        console.log(usa);

        //translate usa TopoJSON
        var usaStates = topojson.feature(usa, usa.objects.USAwithBusinesses).features;
        //examine the results
        console.log(usaStates);

        //add France regions to map
        var regions = map.selectAll(".states")
            .data(usaStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.adm1_code;
            })
            .attr("d", path);

    };

};
