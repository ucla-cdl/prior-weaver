import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import "./Workspace.css";
import { Button, TextField, Slider, Grid, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem } from '@mui/material';
import Variable from '../components/Variable';

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const [variablesDict, setVariablesDict] = useState({});
    const [isAddingVariable, setIsAddingVariable] = useState(false);
    const [newVarName, setNewVarName] = useState('');
    const [newMin, setNewMin] = useState(0);
    const [newMax, setNewMax] = useState(100);
    const [newBins, setNewBins] = useState(10);
    const [selectedVariables, setSelectedVariables] = useState([]);
    const [bivariateVar1, setBivariateVar1] = useState('');
    const [bivariateVar2, setBivariateVar2] = useState('');

    const addNewVariable = () => {
        setIsAddingVariable(true);
    }

    const handleCloseAddingDialog = () => {
        setVariable();
        setIsAddingVariable(false);
    }

    const setVariable = () => {
        const binEdges = d3.range(newBins + 1).map(i => newMin + i * (newMax - newMin) / newBins);
        const newVariable = {
            name: newVarName,
            min: newMin,
            max: newMax,
            numBins: newBins,
            binEdges: binEdges,
            counts: Array(newBins).fill(0),
        };
        setVariablesDict({ ...variablesDict, [newVarName]: newVariable });
    };

    const updateVariable = (variable) => {
        console.log("update", variable);
        setVariablesDict({ ...variablesDict, [variable.name]: variable });
    }

    const handleClickVar = (varName) => {
        if (selectedVariables.includes(varName)) {
            let updatedvariables = selectedVariables;
            updatedvariables = updatedvariables.splice(updatedvariables.indexOf(varName), 1)
            setSelectedVariables(updatedvariables);
        }
        else {
            setSelectedVariables(prev => [...prev, varName]);
        }
    }

    const drawBivariatePlot = () => {
        const chartWidth = 800;
        const chartHeight = 800;
        const margin = { top: 40, right: 40, bottom: 40, left: 40 };
        const marginalPlotWidth = 100; // y-axis marginal hist
        const marginalPlotHeight = 100; // x-axis marginal hist
        const mainPlotWidth = chartWidth - margin.left - margin.right - marginalPlotWidth;
        const mainPlotHeight = chartHeight - margin.top - margin.bottom - marginalPlotHeight;

        document.getElementById("bivariate-distribution-div").innerHTML = "";

        let svg = d3.select("#bivariate-distribution-div").append("svg")
            .attr("id", "bivariate")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        let xScale = d3.scaleLinear()
            .domain([bivariateVar1.min, bivariateVar1.max])
            .range([0, mainPlotWidth]);

        let yScale = d3.scaleLinear()
            .domain([bivariateVar2.min, bivariateVar2.max])
            .range([mainPlotHeight, 0]);

        // create a group for main plot
        const mainPlot = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top + marginalPlotHeight})`)

        // Draw X axis
        mainPlot.append('g')
            .attr('transform', `translate(0, ${mainPlotHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(bivariateVar1.binEdges)
                .tickSize(-mainPlotHeight))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        // Draw Y axis
        mainPlot.append('g')
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(bivariateVar2.binEdges)
                .tickSize(-mainPlotWidth))  // Extend the tick lines across the width of the chart
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        svg.selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        // create x-axis marginal hist (top) - variable 1
        // const xHistData = [];
        // bivariateVar1.counts.forEach((count, index) => {
        //     xHistData.push({ x0: bivariateVar1.binEdges[index], x1: bivariateVar1.binEdges[index + 1], length: count });
        // });

        // const xHistScale = d3.scaleLinear()
        //     .domain([0, d3.max(bivariateVar1.counts)])
        //     .range([marginalPlotHeight, 0])

        // svg.append("g")
        //     .attr("transform", `translate(${margin.left}, ${2 * margin.top})`)
        //     .selectAll("rect")
        //     .data(xHistData)
        //     .enter()
        //     .append("rect")
        //     .attr("x", d => xScale(d.x0))
        //     .attr("y", d => xHistScale(d.length))
        //     .attr("width", d => xScale(d.x1) - xScale(d.x0))
        //     .attr("height", d => marginalPlotHeight - xHistScale(d.length))
        //     .style("fill", "gray");

        // create marginal dot plot (top) - variable 1
        const xDotData = [];
        bivariateVar1.counts.forEach((count, index) => {
            const x0 = bivariateVar1.binEdges[index];
            const x1 = bivariateVar1.binEdges[index + 1];
            const binCenter = (x0 + x1) / 2; // Center of the bin

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                xDotData.push({ binCenter, row: i }); // row is the stacking level
            }
        });

        // Define the y-scale to control how the dots stack
        const dotRadius = 5; // Radius of each dot
        const yDotScale = d3.scaleLinear()
            .domain([0, d3.max(bivariateVar1.counts)]) // Scale based on maximum count
            .range([marginalPlotHeight, 0]); // Dots will stack upwards

        // Append the dots
        svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`)
            .selectAll("circle")
            .data(xDotData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.binCenter)) // Place dot at the bin's center on the x-axis
            .attr("cy", d => yDotScale(d.row + 1)) // Stack dots by their row value
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", "gray");


        // create y-axis marginal hist (right) - variable 2
        // const yHistData = [];
        // bivariateVar2.counts.forEach((count, index) => {
        //     yHistData.push({ y0: bivariateVar2.binEdges[index], y1: bivariateVar2.binEdges[index + 1], length: count });
        // });

        // const yHistScale = d3.scaleLinear()
        //     .domain([0, d3.max(bivariateVar2.counts)])
        //     .range([marginalPlotWidth, 0])

        // svg.append("g")
        //     .attr("transform", `translate(${margin.left + mainPlotWidth}, ${margin.top + marginalPlotHeight})`)
        //     .selectAll("rect")
        //     .data(yHistData)
        //     .enter()
        //     .append("rect")
        //     .attr("x", 0)
        //     .attr("y", d => yScale(d.y1))
        //     .attr("width", d => marginalPlotWidth - yHistScale(d.length))
        //     .attr("height", d => yScale(d.y0) - yScale(d.y1))
        //     .style("fill", "gray");

        // create marginal dot plot (right) - variable 2
        const yDotData = [];
        bivariateVar2.counts.forEach((count, index) => {
            const y0 = bivariateVar2.binEdges[index];
            const y1 = bivariateVar2.binEdges[index + 1];
            const binCenter = (y0 + y1) / 2; // Center of the bin

            // Add dots for each count, each dot will be placed in the bin
            for (let i = 0; i < count; i++) {
                yDotData.push({ binCenter, row: i }); // row is the stacking level
            }
        });

        // Define the x-scale to control how the dots stack horizontally
        const xDotScale = d3.scaleLinear()
            .domain([0, d3.max(bivariateVar2.counts)]) // Scale based on maximum count
            .range([0, marginalPlotWidth]); // Dots will stack leftwards

        // Append the dots for the marginal y-axis dot plot
        svg.append("g")
            .attr("transform", `translate(${margin.left + mainPlotWidth}, ${margin.top + marginalPlotHeight})`)
            .selectAll("circle")
            .data(yDotData)
            .enter()
            .append("circle")
            .attr("cx", d => xDotScale(d.row + 1)) // Stack dots by their row value (horizontally)
            .attr("cy", d => yScale(d.binCenter)) // Place dot at the bin's center on the y-axis
            .attr("r", dotRadius) // Set radius of the dot
            .style("fill", "gray");


        // create interactive grid cells
        for (let i = 0; i < bivariateVar1.binEdges.length - 1; i++) {
            const curGridX = xScale(bivariateVar1.binEdges[i]);
            const nextGridX = xScale(bivariateVar1.binEdges[i + 1]);
            for (let j = 0; j < bivariateVar2.binEdges.length - 1; j++) {
                const curGridY = yScale(bivariateVar2.binEdges[j]);
                const nextGridY = yScale(bivariateVar2.binEdges[j + 1]);

                mainPlot.append("rect")
                    .attr("x", curGridX)
                    .attr("y", nextGridY)
                    .attr("width", nextGridX - curGridX)
                    .attr("height", curGridY - nextGridY)
                    .attr("fill", "transparent")
                    .attr("stroke", "lightgray")
                    .on("mouseover", function () {
                        d3.select(this)
                            .attr("fill", "whitesmoke")
                            .attr("stroke", "gray");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .attr("fill", "transparent")
                            .attr("stroke", "lightgray");
                    })
                    .on("click", function (event) {
                        const [clickX, clickY] = d3.pointer(event);
                        console.log(`click at (${clickX}, ${clickY})`)
                        const xCenter = (curGridX + nextGridX) / 2;
                        const yCenter = (curGridY + nextGridY) / 2;
                        // Add a point at the center of the grid
                        svg.append("circle")
                            .attr("transform", `translate(${margin.left}, ${margin.top + marginalPlotHeight})`)
                            .attr("cx", clickX)
                            .attr("cy", clickY)
                            .attr("r", 5)
                            .style("fill", "blue")
                            .style("opacity", 0.7);
                    });
            }
        }
    }

    const handleSelectBiVar1 = (event) => {
        setBivariateVar1(event.target.value);
    }

    const handleSelectBiVar2 = (event) => {
        setBivariateVar2(event.target.value);
    }

    return (
        <div className='workspace-div'>
            <Button onClick={addNewVariable}>Add Variable</Button>
            <Dialog open={isAddingVariable} sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                <DialogTitle>Adding a New Variable</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Variable Name"
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                    />
                    <TextField
                        label="Min Value"
                        type="number"
                        value={newMin}
                        onChange={(e) => setNewMin(parseFloat(e.target.value))}
                    />
                    <TextField
                        label="Max Value"
                        type="number"
                        value={newMax}
                        onChange={(e) => setNewMax(parseFloat(e.target.value))}
                    />
                    <Typography gutterBottom>Number of Bins</Typography>
                    <Slider
                        value={newBins}
                        onChange={(e, val) => setNewBins(val)}
                        aria-labelledby="bins-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks
                        min={5}
                        max={50}
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={handleCloseAddingDialog}>Add Variable</Button>
                </DialogActions>
            </Dialog>

            {Object.entries(variablesDict).map(([varName, curVar], i) => {
                return (
                    <div key={varName}>
                        <Button variant={selectedVariables.includes(varName) ? 'contained' : 'outlined'} onClick={() => handleClickVar(varName)}>{varName}</Button>
                        {selectedVariables.includes(varName) ?
                            <Variable variable={curVar} updateVariable={updateVariable} />
                            :
                            <></>
                        }
                    </div>
                )
            })}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                <Select
                    value={bivariateVar1}
                    label="Variable 1"
                    onChange={handleSelectBiVar1}
                >
                    {Object.entries(variablesDict).map(([varName, curVar], i) => {
                        return (
                            <MenuItem disabled={varName == bivariateVar2?.name} key={varName} value={curVar}>{varName}</MenuItem>
                        )
                    })}
                </Select>
                <Select
                    value={bivariateVar2}
                    label="Variable 2"
                    onChange={handleSelectBiVar2}
                >
                    {Object.entries(variablesDict).map(([varName, curVar], i) => {
                        return (
                            <MenuItem disabled={varName == bivariateVar1?.name} key={varName} value={curVar}>{varName}</MenuItem>
                        )
                    })}
                </Select>
                <Button onClick={drawBivariatePlot}>Bivariate Distribution</Button>
            </Box>
            <div id='bivariate-distribution-div'></div>
        </div>
    );
};
