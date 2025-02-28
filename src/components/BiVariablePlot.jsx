import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Button, Grid2 } from '@mui/material';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";

const BiVariablePlot = React.forwardRef(({ biVariableDict, biVariable1, biVariable2, updateVariable, updateBivariable, entities }, ref) => {
    const chartWidth = 300;
    const chartHeight = 300;
    const margin = { top: 10, right: 10, bottom: 50, left: 50 };
    const marginalPlotWidth = 0; // y-axis marginal hist
    const marginalPlotHeight = 0; // x-axis marginal hist
    const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
    const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;
    const dotRadius = 5; // Radius of each dot
    const marginDotRadius = 4;
    const toggleHeight = 7;
    const labelOffset = 12;
    const titleOffset = 30;

    const MODES = { "PREDICT": 0, "POPULATE": 1, "CHIP": 2, "COMBINE": 3 };
    const COLORS = { "PREDICT_DOT": "orange", "POPULATE_DOT": "blue", "CHIP_DOT": "blue" }
    const [bivariateMode, setBivariateMode] = useState('COMBINE');
    const [selectedDots, setSelectedDots] = useState([]);
    const [enableSelection, setEnableSelection] = useState(false);

    React.useImperativeHandle(ref, () => ({
        synchronizeSelection,
    }));

    useEffect(() => {
        drawPlot();
        drawGridPlot();
        populateEntities();
    }, [biVariable1, biVariable2])

    useEffect(() => {
        populateEntities();
    }, [entities])

    const populateEntities = () => {
        let mainPlot = d3.select("#bivariate-main-plot");
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        console.log("populate entities in bivar");

        const specifiedEntities = Object.values(entities).filter(d => d[biVariable1.name] !== null && d[biVariable2.name] !== null);

        mainPlot.selectAll(".bivar-entity-dot").remove();

        specifiedEntities.forEach(entity => {
            mainPlot.append("circle")
                .datum(entity)
                .attr("class", "bivar-entity-dot")
                .attr("cx", d => xScale(d[biVariable1.name]))
                .attr("cy", d => yScale(d[biVariable2.name]))
                .attr("r", dotRadius)
                .attr('stroke', 'black')
                .attr("fill", "white")
        });
    }

    const drawGridPlot = () => {
        document.getElementById("bivariate-main-plot").innerHTML = "";
        let mainPlot = d3.select("#bivariate-main-plot")
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        // Draw X axis
        mainPlot.append('g')
            .attr('transform', `translate(0, ${mainPlotHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(biVariable1.binEdges)
                .tickSize(-mainPlotHeight))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        // X axis title
        mainPlot.append("text")
            .attr("text-anchor", "middle")
            .attr("x", mainPlotWidth / 2)
            .attr("y", mainPlotHeight + titleOffset)
            .style("font-size", "14px")
            .text(`${biVariable1.name} (${biVariable1.unitLabel})`);

        // Draw Y axis
        mainPlot.append('g')
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(biVariable2.binEdges)
                .tickSize(-mainPlotWidth))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        // Y axis title
        mainPlot.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -mainPlotHeight / 2)
            .attr("y", -titleOffset)
            .style("font-size", "14px")
            .text(`${biVariable2.name} (${biVariable2.unitLabel})`);

        mainPlot.selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");
    }

    const findGird = (x, y) => {
        let binIndexX = -1, binIndexY = -1;

        for (let indexX = 0; indexX < biVariable1.binEdges.length - 1; indexX++) {
            const xEdge1 = biVariable1.binEdges[indexX];
            const xEdge2 = biVariable1.binEdges[indexX + 1];

            // Find the correspond X bin
            if (xEdge1 <= x && x <= xEdge2) {
                for (let indexY = 0; indexY < biVariable2.binEdges.length - 1; indexY++) {
                    const yEdge1 = biVariable2.binEdges[indexY];
                    const yEdge2 = biVariable2.binEdges[indexY + 1];

                    // Find the correspond Y bin
                    if (yEdge1 <= y && y <= yEdge2) {
                        binIndexX = indexX;
                        binIndexY = indexY;
                    }
                }
            }
        }

        return { binIndexX, binIndexY };
    }

    const fitRelation = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        axios
            .post(window.BACKEND_ADDRESS + "/fitBiVarRelation", {
                populateDots: biVariableDict[biVarName].populateDots,
                chipDots: biVariableDict[biVarName].chipDots
            })
            .then((resp) => {
                updateBivariable(biVarName, { 
                    "fittedRelation": resp.data,
                    "specified": true,
                });
                drawFittedRelation(resp.data.fittedLine);
                logUserBehavior(`bi-plot(${biVarName})`, "click", `fit bvariate relationship`, `${resp.data.equation}`)
            })
    }

    const drawFittedRelation = (fittedLine) => {
        let mainPlot = d3.select("#bivariate-main-plot");
        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, mainPlotWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([mainPlotHeight, 0]);

        d3.select("#bivariate-plot-relation")?.remove()
        let g = mainPlot.append("g")
            .attr("id", "bivariate-plot-relation");

        // Line for the Regression Fit
        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));

        g.append("path")
            .datum(fittedLine)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    const clearAll = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        logUserBehavior(`bi-plot(${biVarName})`, "click button", "clear all", "");
        d3.selectAll(".predict-dot").remove();
        d3.selectAll(".populate-dot").remove();
        d3.selectAll(".chip-dot").remove();
        d3.selectAll(".predict-line").remove();
        // d3.selectAll(".grids").attr("fill", "transparent");

        updateBivariable(biVarName, {
            "predictionDots": [],
            "populateDots": [],
            "chipDots": [],
            "fittedRelation": {},
        });
    }

    const activeRegionalSelection = () => {
        // Define the brush behavior
        const brush = d3.brush()
            .extent([[0, 0], [mainPlotWidth, mainPlotHeight]])
            .on("start brush end", brushed);
        const mainPlot = d3.select("#bivariate-main-plot");

        function brushed(event) {
            let selectedDots = [];
            const selection = event.selection;
            let xScale = d3.scaleLinear()
                .domain([biVariable1.min, biVariable1.max])
                .range([0, mainPlotWidth]);
            let yScale = d3.scaleLinear()
                .domain([biVariable2.min, biVariable2.max])
                .range([mainPlotHeight, 0]);

            let dots = mainPlot.selectAll(".populate-dot, .chip-dot");
            console.log("dots", dots);
            if (selection) {
                const [[x0, y0], [x1, y1]] = selection;
                selectedDots = dots
                    .filter(d => {
                        console.log("dot data", d);
                        const cx = xScale(d.x);
                        const cy = yScale(d.y);
                        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
                    })
                    .style("stroke", "red")
                    .data();
                setSelectedDots(selectedDots);

                mainPlot.on("contextmenu", function (event) {
                    event.preventDefault();
                    const [mouseX, mouseY] = d3.pointer(event);

                    // Remove any existing context menu
                    d3.select("#context-menu").remove();

                    // Create a new context menu
                    const contextMenu = mainPlot.append("div")
                        .attr("id", "context-menu")
                        .style("position", "absolute")
                        .style("left", `${mouseX}px`)
                        .style("top", `${mouseY}px`)
                        .style("background", "white")
                        .style("border", "1px solid black")
                        .style("padding", "10px")
                        .style("z-index", 1000);

                    contextMenu.append("div")
                        .text("Option 1")
                        .on("click", () => {
                            console.log("Option 1 clicked");
                            // Handle Option 1 click
                            contextMenu.remove();
                        });

                    contextMenu.append("div")
                        .text("Option 2")
                        .on("click", () => {
                            console.log("Option 2 clicked");
                            // Handle Option 2 click
                            contextMenu.remove();
                        });

                    // Remove context menu on click outside
                    d3.select("body").on("click.context-menu", () => {
                        contextMenu.remove();
                        d3.select("body").on("click.context-menu", null);
                    });
                });
            }
            else {
                dots.style("stroke", "blue")
                mainPlot.on("contextmenu", null); // Remove context menu event listener
            }
        }

        if (enableSelection) {
            mainPlot.selectAll(".brush").remove();
            setEnableSelection(false);
        }
        else {
            mainPlot.append("g")
                .attr("class", "brush")
                .call(brush);
            setEnableSelection(true);
        }
    }

    const clearRegional = () => {
        const biVarName = biVariable1.name + "-" + biVariable2.name;
        logUserBehavior(`bi-plot(${biVarName})`, "click button", "clear regional", "");
        console.log(selectedDots);
        selectedDots.forEach(dot => {
            d3.selectAll(`.populate-dot, .chip-dot`)
                .filter(d => d.x === dot.x && d.y === dot.y)
                .remove();
        });

        const newPopulateDots = biVariableDict[biVarName].populateDots.filter(dot => !selectedDots.some(sel => sel.x === dot.x && sel.y === dot.y));
        const newChipDots = biVariableDict[biVarName].chipDots.filter(dot => !selectedDots.some(sel => sel.x === dot.x && sel.y === dot.y));

        let newBivar1Counts = [...biVariable1.counts];
        let newBivar2Counts = [...biVariable2.counts];
        selectedDots.forEach(dot => {
            const { binIndexX, binIndexY } = findGird(dot.x, dot.y);
            newBivar1Counts[binIndexX] -= 1;
            newBivar2Counts[binIndexY] -= 1;
        });
        updateVariable(biVariable1.name, { "counts": newBivar1Counts });
        updateVariable(biVariable2.name, { "counts": newBivar2Counts });

        updateBivariable(biVarName, {
            "populateDots": newPopulateDots,
            "chipDots": newChipDots,
        });
        setSelectedDots([]);
    }

    const synchronizeSelection = (selectedEntities) => {
        let mainPlot = d3.select("#bivariate-main-plot");

        mainPlot.selectAll(".bivar-entity-dot")
            .attr("fill", d => selectedEntities.includes(d) ? "steelblue" : "white")
    }

    const drawPlot = () => {
        document.getElementById("bivariate-distribution-div").innerHTML = "";

        let svg = d3.select("#bivariate-distribution-div").append("svg")
            .attr("id", "bivariate-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        svg.append("g")
            .attr("id", "bivariate-main-plot")
            .attr("transform", `translate(${margin.left}, ${margin.top + marginalPlotHeight})`)
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <Button sx={{ m: 1 }} variant="outlined" color='success' onClick={fitRelation}>Fit Trend</Button>
                <Button sx={{ m: 1 }} variant={enableSelection ? 'contained' : 'outlined'} onClick={activeRegionalSelection}>Selection</Button>
                <Button sx={{ m: 1 }} onClick={clearRegional}>Clear regional</Button>
                <Button sx={{ m: 1 }} onClick={clearAll}>Clear all</Button>
            </Box> */}
            <div id='bivariate-distribution-div'></div>
        </Box >
    )
})

export default BiVariablePlot;