import React, { useState, useRef, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { Box, Paper } from '@mui/material';
import { EntityContext } from "../contexts/EntityContext";
import { VariableContext } from "../contexts/VariableContext";
import { SelectionContext, FILTER_TYPES } from "../contexts/SelectionContext";
import "./VariablePlot.css";

// Define the Variable Component
export default function VariablePlot({ variable }) {
    const { variablesDict } = useContext(VariableContext);
    const { entities, addEntities, updateEntities, getEntitiesCntDifference } = useContext(EntityContext);
    const { selectedEntities, activeFilter } = useContext(SelectionContext);

    const svgWidthRef = useRef(0);
    const svgHeightRef = useRef(0);
    const marginLeft = 40;
    const marginRight = 10;
    const marginTop = 15;
    const marginBottom = 37;
    const labelOffset = 35;

    useEffect(() => {
        console.log("variable", variable);
        drawPlot();
    }, [variable]);

    useEffect(() => {
        drawRoulette();
    }, [variable, entities, activeFilter]);

    useEffect(() => {
        updateHighlightedEntities();
    }, [selectedEntities]);

    const drawPlot = () => {
        const container = d3.select(`#univariate-container-${variable.name}`);
        container.html("");

        const svgWidth = container.node().clientWidth;
        svgWidthRef.current = svgWidth;
        const svgHeight = container.node().clientHeight;
        svgHeightRef.current = svgHeight;

        const svg = container.append("svg")
            .attr("id", `univariate-svg-${variable.name}`)
            .attr("width", svgWidth)
            .attr("height", svgHeight);
    }

    const drawRoulette = () => {
        console.log("populate entities in univariate plot");

        let svg = d3.select(`#univariate-svg-${variable.name}`);
        svg.html("");
        let chart = svg.append("g")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);

        let chartWidth = svgWidthRef.current - marginLeft - marginRight;
        let chartHeight = svgHeightRef.current - marginTop - marginBottom;

        // const [currentCnt, difference] = getEntitiesCntDifference(variable.name);
        // chart.append("text")
        //     .attr("class", "total-entities-text")
        //     .attr("text-anchor", "middle")
        //     .attr("transform", `translate(${chartWidth / 2}, ${- marginTop / 2})`)
        //     .style("font-size", "14px")
        //     .style("fill", difference > 0 ? "red" : "#666")
        //     .text(`# of Data Points: ${currentCnt} ${difference > 0 ? `(-${difference})` : ""}`);

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([0, chartWidth]);

        let binInfos = [];
        for (let index = 0; index < variable.binEdges.length - 1; index++) {
            const leftEdge = variable.binEdges[index];
            const rightEdge = variable.binEdges[index + 1];
            const binEntities = Object.values(entities).filter(e => e[variable.name] >= leftEdge && e[variable.name] < rightEdge && e[variable.name] !== null);

            // Separate complete and incomplete entities
            const completeEntities = binEntities.filter(entity =>
                Object.keys(variablesDict).every(varName => entity[varName] !== null && entity[varName] !== undefined)
            );
            const incompleteEntities = binEntities.filter(entity =>
                Object.keys(variablesDict).some(varName => entity[varName] === null || entity[varName] === undefined)
            );

            const binHeight = binEntities.length;
            binInfos.push({
                height: binHeight,
                entities: binEntities,
                completeEntities: completeEntities,
                incompleteEntities: incompleteEntities,
                completeHeight: completeEntities.length,
                incompleteHeight: incompleteEntities.length
            });
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
                .tickFormat(d3.format("d")))
            .selectAll(".tick text")
            .attr("transform", "rotate(30)")
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
            .attr('transform', `translate(${- marginLeft / 2}, ${chartHeight / 2})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr('transform', 'rotate(-90)')
            .style("font-size", "14px")
            .style("font-family", "Times New Roman")
            .text("Count");

        // Draw Interactive Grid with stacked complete/incomplete entities
        for (let grid = 1; grid <= maxY; grid++) {
            for (let bin = 0; bin < variable.binEdges.length - 1; bin++) {
                const binInfo = binInfos[bin];
                const binCnt = binInfo.height;
                const incompleteHeight = binInfo.incompleteHeight;
                const completeHeight = binInfo.completeHeight;

                let cellClass = "non-fill-grid-cell";

                // Determine cell class based on stacking logic
                if (activeFilter === FILTER_TYPES.COMPLETE) {
                    if (grid <= completeHeight) {
                        cellClass = "filtered-entity-cell";
                    } else if (grid <= completeHeight + incompleteHeight) {
                        cellClass = "fill-grid-cell";
                    }
                }
                else if (activeFilter === FILTER_TYPES.INCOMPLETE) {
                    if (grid <= incompleteHeight) {
                        cellClass = "filtered-entity-cell";
                    } else if (grid <= completeHeight + incompleteHeight) {
                        cellClass = "fill-grid-cell";
                    }
                }

                chart.append("rect")
                    .attr("class", cellClass)
                    .attr("id", `${variable.name}-${bin}-${grid}`)
                    .attr("transform", `translate(${xScale(variable.binEdges[bin])}, ${yScale(grid)})`)
                    .attr("width", xScale(variable.binEdges[bin + 1]) - xScale(variable.binEdges[bin]))
                    .attr("height", yScale(grid) - yScale(grid + 1))
                    .on("click", function (event, d) {
                        if (grid <= binInfo.completeHeight) {
                            return;
                        }
                        // Update entities
                        let deltaHeight = grid - binInfo.height;
                        // if clicked count is larger than previous, then add new entities (randomly generated in the bin)
                        if (deltaHeight > 0) {
                            let newEntitiesData = [];
                            for (let i = 0; i < deltaHeight; i++) {
                                newEntitiesData.push({
                                    [variable.name]: Math.random() * (variable.binEdges[bin + 1] - variable.binEdges[bin]) + variable.binEdges[bin]
                                });
                            }
                            const addType = deltaHeight === 1 ? "single" : "multiple";
                            addEntities(newEntitiesData, "univariate", addType);
                        }
                        // if clicked count is smaller than or equal to previous, then update values of existing entities
                        else {
                            const individualEntities = binInfo.entities.filter(e => Object.entries(e).filter(([key, value]) => key !== "id" && value !== null).length === 1);
                            if (individualEntities.length === 0) {
                                alert('No individual entities can be removed. Please remove entities in the parallel coordinates plot.');
                                return;
                            }

                            let updatedEntities = individualEntities.slice(grid); // remove based on FIFO
                            if (deltaHeight === 0) {
                                // remove current entity
                                updatedEntities = individualEntities.slice(-1);
                            }

                            const updateType = deltaHeight === 0 ? "single" : "multiple";
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
                                }),
                                "univariate",
                                updateType
                            );
                        }
                    });
            }
        }
    }

    const updateHighlightedEntities = () => {
        let chart = d3.select(`#univariate-svg-${variable.name}`);

        // Clear any existing highlights
        chart.selectAll("rect")
            .classed("highlight-grid-cell", false);

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

        for (let bin = 0; bin < variable.binEdges.length - 1; bin++) {
            for (let grid = 1; grid <= binCounts[bin]; grid++) {
                chart.select(`#${variable.name}-${bin}-${grid}`)
                    .classed("highlight-grid-cell", true);
            }
        }
    }

    return (
        <Box id={`univariate-container-${variable.name}`}
            sx={{
                boxSizing: 'border-box', minWidth: '33.3%', height: '100%', display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
        </Box>
    );
};