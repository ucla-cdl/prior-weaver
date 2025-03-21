import React, { useState, useRef, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { Box, Paper } from '@mui/material';
import { EntityContext } from "../contexts/EntityContext";
import { SelectionContext, SELECTION_TYPE } from "../contexts/SelectionContext";
import "./VariablePlot.css";

// Define the Variable Component
export default function VariablePlot({ variable }) {
    const { entities, addEntities, updateEntities, getEntitiesCntDifference } = useContext(EntityContext);
    const { selectedEntities, selectionGroup1Entities, selectionGroup2Entities, selectionType } = useContext(SelectionContext);
    const svgWidth = 300;
    const svgHeightRef = useRef(0);
    const marginX = 40;
    const marginTop = 25;
    const marginBottom = 55;
    const labelOffset = 35;

    useEffect(() => {
        console.log("variable", variable);
        drawPlot();
    }, [variable]);

    useEffect(() => {
        drawRoulette();
    }, [variable, entities]);

    useEffect(() => {
        updateHighlightedEntities();
    }, [selectedEntities]);

    const drawPlot = () => {
        const container = d3.select(`#univariate-container-${variable.name}`);
        container.html("");

        const svgHeight = container.node().clientHeight;
        svgHeightRef.current = svgHeight;

        container.append("svg")
            .attr("id", `univariate-svg-${variable.name}`)
            .attr("width", svgWidth)
            .attr("height", svgHeight);
    }

    const drawRoulette = () => {
        console.log("populate entities in univariate plot");

        let svg = d3.select(`#univariate-svg-${variable.name}`);
        svg.html("");
        let chart = svg.append("g")
            .attr("transform", `translate(${marginX}, ${marginTop})`);

        let chartWidth = svgWidth - marginX * 2;
        let chartHeight = svgHeightRef.current - marginTop - marginBottom;

        const [currentCnt, difference] = getEntitiesCntDifference(variable.name);
        chart.append("text")
            .attr("class", "total-entities-text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${chartWidth / 2}, ${- marginTop / 2})`)
            .style("font-size", "14px")
            .style("fill", difference > 0 ? "red" : "#666")  
            .text(`Total Entities: ${currentCnt} ${difference > 0 ? `(-${difference})` : ""}`);

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([0, chartWidth]);

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
            .range([chartHeight, 0]);

        // Draw X axis
        chart.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(variable.binEdges)
                .tickFormat(d3.format("d"))
            )
            .selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");

        // Add X axis label
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${chartWidth / 2}, ${chartHeight + labelOffset})`)
            .style("font-size", "14px")
            .text(`${variable.name} (${variable.unitLabel})`);

        // Draw Y axis
        chart.append('g')
            .attr('transform', `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(d3.range(0, maxY + 1))
            )
            .selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman");

        // Add Y axis label
        chart
            .append("g")
            .attr('transform', `translate(${- marginX / 2}, ${chartHeight / 2})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr('transform', 'rotate(-90)')
            .style("font-size", "14px")
            .style("font-family", "Times New Roman")
            .text("Count");

        // Draw Interactive Grid
        for (let grid = 1; grid <= maxY; grid++) {
            for (let bin = 0; bin < variable.binEdges.length - 1; bin++) {
                const binCnt = binInfos[bin].height;
                chart.append("rect")
                    .attr("class", binCnt >= grid ? "fill-grid-cell" : "non-fill-grid-cell")
                    .attr("id", `${variable.name}-${bin}-${grid}`)
                    .attr("transform", `translate(${xScale(variable.binEdges[bin])}, ${yScale(grid)})`)
                    .attr("width", xScale(variable.binEdges[bin + 1]) - xScale(variable.binEdges[bin]))
                    .attr("height", yScale(grid) - yScale(grid + 1))
                    .on("click", function (event, d) {
                        // Update entities
                        let deltaHeight = grid - binInfos[bin].height;
                        // if clicked count is larger than previous, then add new entities (randomly generated in the bin)
                        if (deltaHeight > 0) {
                            let newEntitiesData = [];
                            for (let i = 0; i < deltaHeight; i++) {
                                newEntitiesData.push({
                                    [variable.name]: Math.random() * (variable.binEdges[bin + 1] - variable.binEdges[bin]) + variable.binEdges[bin]
                                });
                            }
                            addEntities(newEntitiesData);
                        }
                        // if clicked count is smaller than or equal to previous, then update values of existing entities
                        else {
                            let updatedEntities = binInfos[bin].entities.slice(grid); // remove based on FIFO
                            if (deltaHeight === 0) {
                                // remove current entity
                                updatedEntities = binInfos[bin].entities.slice(-1);
                            }

                            updateEntities(
                                updatedEntities.map(entity => entity.id),
                                updatedEntities.map(entity => {
                                    // Check if entity would have all null values after update
                                    let wouldBeAllNull = true;
                                    for (let key in entity) {
                                        if (key !== 'id' && key !== variable.name && entity[key] !== null) {
                                            wouldBeAllNull = false;
                                            break;
                                        }
                                    }

                                    // If all values would be null, return object with all nulls to trigger deletion
                                    if (wouldBeAllNull) {
                                        const nullData = {};
                                        Object.keys(entity).forEach(key => {
                                            if (key !== 'id') nullData[key] = null;
                                        });
                                        return nullData;
                                    }

                                    // Otherwise just update the specific variable
                                    return { [variable.name]: null };
                                })
                            );
                        }
                    });
            }
        }
    }

    const updateHighlightedEntities = () => {
        let chart = d3.select(`#univariate-svg-${variable.name}`);

        // Return early if either group has values for this variable
        if (selectionGroup1Entities?.some(entity => entity[variable.name] !== null)) return;
        if (selectionGroup2Entities?.some(entity => entity[variable.name] !== null)) return;

        // Clear any existing highlights
        chart.selectAll("rect")
            .classed("highlight-grid-cell", false)
            .classed("group-1-cell", false)
            .classed("group-2-cell", false);

        // Group selected entities by bin
        let binCounts = new Array(variable.binEdges.length - 1).fill(0);

        selectedEntities.forEach(entity => {
            if (entity[variable.name] !== null) {
                for (let i = 0; i < variable.binEdges.length - 1; i++) {
                    if (entity[variable.name] >= variable.binEdges[i] &&
                        entity[variable.name] < variable.binEdges[i + 1]) {
                        binCounts[i]++;
                        break;
                    }
                }
            }
        });

        // Add highlights for selected entities
        for (let bin = 0; bin < variable.binEdges.length - 1; bin++) {
            for (let grid = 1; grid <= binCounts[bin]; grid++) {
                chart.select(`#${variable.name}-${bin}-${grid}`)
                    .classed("highlight-grid-cell", true)
                    .classed("group-1-cell", selectionType === SELECTION_TYPE.GROUP_1)
                    .classed("group-2-cell", selectionType === SELECTION_TYPE.GROUP_2);
            }
        }
    }

    return (
        <Box id={`univariate-container-${variable.name}`} sx={{ height: '100%', boxSizing: 'border-box' }}>
        </Box>
    );
};