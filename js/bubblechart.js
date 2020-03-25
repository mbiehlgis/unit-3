//global variables for panel sizes
var w = 900, h = 500;

//execute script when window is loaded
window.onload = function(){

// RULE 1: Create only ONE new element per block, container block has svg, innerRect block has rect
// RULE 2: ALL DATA PASSED WITH THE .DATA OPERATOR MUST BE AN ARRAY
// RULE 3: Always pass the block's name as a class selector to the selectAll method when creating an empty selection

    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //always assign a class (as the block name) for styling and future selection
                                    // the class here is "container"
        .style("background-color", "#DA70D6"); //only put a semicolon at the end of the block!
        // .append("rect") //add a <rect> element
        // .attr("width", 800) //rectangle width
        // .attr("height", 400) //rectangle height

    var innerRect = container.append("rect") //adding new rectangle to svg without replacing svg
        .datum(400) //!!!IMPORTANT: "400" is now the default parameter value for any anonymous function in this block!
        .attr("width", function(d){ //rectangle width
          return d * 2;
        })
        .attr("height", function(d){ //rectangle height
          return d * 1;
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#D8BFD8"); //fill color

console.log(innerRect);

    var cityPop = [
         {
             city: 'Madison',
             population: 233209
         },
         {
             city: 'Milwaukee',
             population: 594833
         },
         {
             city: 'Green Bay',
             population: 104057
         },
         {
             city: 'Superior',
             population: 27244
         }
      ];

        // ** creating variable for x-coordinate linear scale ** //

    var x = d3.scaleLinear() //create the scale
        .range([100, 700]) //output min and max
        .domain([0, 3]); //input min and max
    console.log(x);

        // ** using min and max to determin y-coordinate height ** //

    //find the minimum value of the array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //scale for circles center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50]) // was 440 and 95, but changed so that the axes would be clean round numbers with actual values just in the table
        .domain([0, 700000]);

        // ** Color Ramp ** //
    var color = d3.scaleLinear()
        .range([
            "#E0FFFF",
            "#151B54"
        ]) // For a classed color scheme (such as you will use in the D3 lab),
           // you simply need to provide an array with each of the colors used for the classes as the range.

        .domain([
            minPop,
            maxPop
        ]);

        // ** CREATING CIRCLES FROM ARRAY ** //
    var circles = container.selectAll(".circles") //but wait--there are no circles yet!
                                                   //common practice use the class name of future elements as parameter
        .data(cityPop) //here we feed in an array

        .enter() //one of the great mysteries of the universe

        //Picture the entire block after .enter() as a loop—one in which you have immediate access to each...
        //...array value and the array index within every anonymous function fed to an operator

        .append("circle") //add a circle element for each datum, same as appending svg/rect but now to an array

        .attr("class", "circles") //apply a class name to all circles from the array

        .attr("id", function(d){
            return d.city;
        })

        .attr("r", function(d){
            //calculate the radius based on population value as circle area
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })

        // .attr("cx", function(d, i){
        //     //use the index to place each circle horizontally
        //     return 90 + (i * 180);
        // })

        .attr("cx", function (d, i){
            //use the scale generator with the index to place each circle horizontally
            return x(i)
        })

        // .attr("cy", function(d){
        //     //subtract value from 450 to "grow" circles up from the bottom instead of down from the top of the SVG
        //     return 450 - (d.population * 0.0005);
        // })

        .attr("cy", function(d){
            return y(d.population);
        })

        .style("fill", function(d, i){ //add a fill based on the color scale generator
            return color(d.population);
        })

        .style("stroke", "#000"); //black circle stroke

        // ** CREATING AXES **

    //creating the y-axis generator
    var yAxis = d3.axisLeft(y);

    //create axis g element and add axis
    var axis = container.append("g") // <g> is a group element to store the new child elements being generated
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)") // slides axis over to the actual graph area from the left
        .call(yAxis); // equivalent to "yAxis(axis)"

    //CREATING TITLE PANEL
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations")
        .style("font-family", "arial")
        .style("font-weight", "bold")
        .style("font-size", "20pt");

    //CREATING DYNAMIC LABELS
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population) + 5;
        })
        .attr("dy", "-10") // correcting alignment of labels to fit on graph
        .style("font-family", "arial")
        .style("font-size", "10pt");

    //first line of label
    var nameLine = labels.append("tspan")

        .attr("class", "nameLine")

        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })

        .text(function(d){
            return d.city;
        });

    //create format generator to add commas to populations
    var format = d3.format(",");

    //second line of label
    var popLine = labels.append("tspan")

        .attr("class", "popLine")

        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })

        .attr("dy", "15") //vertical offset

        .text(function(d){
            return "Pop. " + format(d.population);
        });

};
