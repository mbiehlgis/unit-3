(function(){

    //pseudo-global variables
    // var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
    // var expressed = attrArray[0]; //initial attribute


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
        var projection = d3.geoAlbersUsa() //Composite projection is fixed. Does not support .center, .rotate, .clipAngle, or .clipExtent

            //.center([0, 46.2])      //specifies the [longitude, latitude] coordinates of the center of the developable surface.

            //.rotate([-2, 0, 0])     //specifies the [longitude, latitude, and roll] angles by which to rotate the reference globe

            //.parallels([55, 65])    // specifies the two standard parallels of a conic projection. If the two array values are the same,
                                    //the projection is a tangent case (the plane intersects the globe at one line of latitude);
                                    //if they are different, it is a secant case (the plane intersects the globe at two lines of latitude, slicing through it).

            .scale(1070)            //is a factor by which distances between points are multiplied, increasing or decreasing the scale of the map.

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
            setGraticule(map, path);

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

            var colorScale = makeColorScale(usa)

            //add enumeration units to the map
            setEnumerationUnits(usaStates, map, path);

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
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
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
                return colorScale(d.properties);
            });
        };

    })();
