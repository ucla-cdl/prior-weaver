import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { logUserBehavior } from '../utils/BehaviorListener';
import axios from "axios";
import { Box, Paper } from '@mui/material';
import "./VariablePlot.css";

// Define the Variable Component
export default function VariablePlot({ variableDict, variable, updateVariable, entities, addEntities, updateEntities, deleteEntities }) {
    const chartWidth = 300;
    const chartHeight = 250;
    const offsetX = 40;
    const offsetY = 40;
    const toggleHeight = 8;
    const titleOffset = 30;
    const svgRef = useRef(null);

    useEffect(() => {
        drawPlot();
    }, [variable]);

    useEffect(() => {
        drawRoulette();
    }, [variable, entities]);

    const drawPlot = () => {
        const divID = "univariate-div-" + variable.name;
        document.getElementById(divID).innerHTML = "";
        // const chartWidth = document.getElementById(divID).clientWidth;

        let svg = d3.select("#" + divID).append("svg")
            .attr("id", "univariate-svg-" + variable.name)
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        svg.append("g")
            .attr("id", "univariate-histogram-" + variable.name);
    }

    const drawRoulette = () => {
        console.log("populate entities in univariate plot");

        document.getElementById("univariate-histogram-" + variable.name).innerHTML = "";
        let histogramPlot = d3.select("#univariate-histogram-" + variable.name);
        const chartWidth = document.getElementById("univariate-div-" + variable.name).clientWidth;

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let binInfos = [];
        for (let index = 0; index < variable.binEdges.length - 1; index++) {
            const leftEdge = variable.binEdges[index];
            const rightEdge = variable.binEdges[index + 1];
            const binEntities = Object.values(entities).filter(e => e[variable.name] >= leftEdge && e[variable.name] < rightEdge && e[variable.name] !== null);
            const binHeight = binEntities.length;
            binInfos.push({ height: binHeight, entities: binEntities });
        }

        let maxY = d3.max(binInfos.map(d => d.height)) < 8 ? 10 : d3.max(binInfos.map(d => d.height)) + 2;
        let yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight - offsetY, offsetY]);

        // Draw X axis
        histogramPlot.append('g')
            .attr('transform', `translate(0, ${chartHeight - offsetY})`)
            .call(d3.axisBottom(xScale)
                .tickValues(variable.binEdges)
                .tickSize(-(chartHeight - 2 * offsetY))
                .tickFormat(d3.format("d"))
            )
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges") // Prevent anti-aliasing for crisp grid lines
            .selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");

        histogramPlot.append("text")
            .attr("text-anchor", "middle")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight - offsetY + titleOffset)
            .style("font-size", "14px")
            .text(variable.name);

        // Draw Y axis
        histogramPlot.append('g')
            .attr('transform', `translate(${offsetX}, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(d3.range(0, maxY + 1))
                .tickSize(-(chartWidth - 2 * offsetX)))
            .selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges") // Prevent anti-aliasing for crisp grid lines
            .selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");
        
        // Add Y axis label
        histogramPlot
            .append("g")
            .attr('transform', `translate(${offsetX - titleOffset}, ${chartHeight / 2})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr('transform', 'rotate(-90)')
            .style("font-size", "14px")
            .style("font-family", "Times New Roman")
            .text("Count");

        // Draw Interactive Grid
        for (let grid = 0; grid < maxY; grid++) {
            for (let bin = 0; bin < variable.binEdges.length - 1; bin++) {
                const index = bin;
                const binCnt = binInfos[index].height;
                histogramPlot.append("rect")
                    .attr("class", binCnt > grid ? "fill-grid-cell" : "non-fill-grid-cell")
                    .attr("id", `${variable.name}-${grid}-${bin}`)
                    .attr("x", xScale(variable.binEdges[bin]))
                    .attr("y", yScale(grid + 1))
                    .attr("width", xScale(variable.binEdges[bin + 1]) - xScale(variable.binEdges[bin]))
                    .attr("height", yScale(grid) - yScale(grid + 1))
                    .on("mouseover", function (event, d) {
                        d3.select(this)
                            .classed(binCnt > grid ? "fill-grid-cell" : "non-fill-grid-cell", false)
                            .classed("hover-grid-cell", true);
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .classed("hover-grid-cell", false)
                            .classed(binCnt > grid ? "fill-grid-cell" : "non-fill-grid-cell", true);
                    })
                    .on("click", function (event, d) {
                        // Update entities
                        let deltaHeight = (grid + 1) - binInfos[index].height;
                        // - if current count is larger than previous, then add new entities (randomly generated in the bin)
                        if (deltaHeight > 0) {
                            let newEntitiesData = [];
                            for (let i = 0; i < deltaHeight; i++) {
                                newEntitiesData.push({
                                    [variable.name]: Math.random() * (variable.binEdges[index + 1] - variable.binEdges[index]) + variable.binEdges[index]
                                });
                            }
                            addEntities(newEntitiesData);
                        }
                        // - if current count is smaller than previous, then update values of existing entities
                        else if (deltaHeight < 0) {
                            let updatedEntities = binInfos[index].entities.slice(grid + 1); // remove based on FIFO
                            
                            // Separate entities into those to delete and those to update
                            let entitiesToDelete = [];
                            let entitiesToUpdate = [];
                            
                            updatedEntities.forEach(entity => {
                                // Check if entity would have all null values after update
                                let wouldBeAllNull = true;
                                for (let key in entity) {
                                    if (key !== 'id' && key !== variable.name && entity[key] !== null) {
                                        wouldBeAllNull = false;
                                        break;
                                    }
                                }
                                
                                if (wouldBeAllNull) {
                                    entitiesToDelete.push(entity.id);
                                } else {
                                    entitiesToUpdate.push({
                                        id: entity.id,
                                        data: { [variable.name]: null }
                                    });
                                }
                            });

                            // Delete entities that would have all null values
                            if (entitiesToDelete.length > 0) {
                                deleteEntities(entitiesToDelete);
                            }
                            
                            // Update remaining entities
                            if (entitiesToUpdate.length > 0) {
                                updateEntities(
                                    entitiesToUpdate.map(e => e.id),
                                    entitiesToUpdate.map(e => e.data)
                                );
                            }
                        }
                    });
            }
        }
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ fontSize: '0.875rem', color: '#666' }}>
                Total Entities: {Object.values(entities).filter(e => e[variable.name] !== null).length}
            </Box>
            <Box sx={{ mx: 2 }} id={"univariate-div-" + variable.name}>

            </Box>
        </Box>
    );
};