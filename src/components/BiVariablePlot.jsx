import './BiVariablePlot.css';
import React, { useState, useRef, useEffect, useContext } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { SelectionContext, SELECTION_SOURCES } from '../contexts/SelectionContext';

export default function BiVariablePlot({ biVarName1, biVarName2 }) {
    const { variablesDict } = useContext(VariableContext);
    const { entities } = useContext(EntityContext);
    const { activeFilter, setSelectedEntities, isHidden, selections, updateSelections, selectionsRef, selectionSource, potentialEntities } = useContext(SelectionContext);

    const chartWidthRef = useRef(0);
    const chartHeightRef = useRef(0);
    const margin = { top: 10, right: 15, bottom: 40, left: 40 };
    const dotRadius = 5;
    const titleOffset = 30;

    const xScaleRef = useRef(null);
    const yScaleRef = useRef(null);

    const [biVariable1, setBiVariable1] = useState(null);
    const [biVariable2, setBiVariable2] = useState(null);

    useEffect(() => {
        if (variablesDict && biVarName1 && biVarName2) {
            setBiVariable1(variablesDict[biVarName1]);
            setBiVariable2(variablesDict[biVarName2]);
        }
    }, [variablesDict, biVarName1, biVarName2]);

    useEffect(() => {
        if (biVariable1 && biVariable2) {
            drawPlot();
            populateEntities();
        }
    }, [biVariable1, biVariable2, entities])

    useEffect(() => {
        if (biVariable1 && biVariable2) {
            const fromExternal = selectionSource === SELECTION_SOURCES.PARALLEL;
            const newSelectedEntities = updateHighlightedEntities();
            if (!fromExternal) {
                setSelectedEntities(newSelectedEntities);
            }
        }
    }, [activeFilter, selections]);

    const drawPlot = () => {
        const container = d3.select(`#bivariate-distribution-div-${biVarName1}-${biVarName2}`);
        container.html("");

        const svgWidth = container.node().clientWidth;
        const svgHeight = container.node().clientHeight;

        let svg = container.append("svg")
            .attr("id", `bivariate-svg-${biVarName1}-${biVarName2}`)
            .attr("width", svgWidth)
            .attr("height", svgHeight)

        let chart = svg.append("g")
            .attr("id", `bivariate-chart-${biVarName1}-${biVarName2}`)
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        let chartWidth = svgWidth - margin.left - margin.right;
        let chartHeight = svgHeight - margin.top - margin.bottom;
        chartWidthRef.current = chartWidth;
        chartHeightRef.current = chartHeight;

        let xScale = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, chartWidth]);
        let yScale = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([chartHeight, 0]);

        // Draw X axis
        chart.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale)
                .tickValues(biVariable1.binEdges)
                .tickSize(-chartHeight)
                .tickFormat(d3.format("d")))
            .selectAll(".tick text")
            .attr("transform", "rotate(30)")
            .style("text-anchor", "start")

        // X axis title
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight + titleOffset)
            .style("font-size", "14px")
            .text(`${biVariable1.name} (${biVariable1.unitLabel})`);

        // Draw Y axis
        chart.append('g')
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisLeft(yScale)
                .tickValues(biVariable2.binEdges)
                .tickSize(-chartWidth))
            .selectAll(".tick text")
            .attr("transform", "rotate(-30)")
            .style("text-anchor", "end")

        // Y axis title
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -chartHeight / 2)
            .attr("y", -titleOffset)
            .style("font-size", "14px")
            .text(`${biVariable2.name} (${biVariable2.unitLabel})`);

        // Draw grid lines
        chart.selectAll(".tick line")
            .style("stroke", "lightgray")  // Set the color of the grid lines
            .style("stroke-opacity", 0.7)  // Set the opacity of the grid lines
            .style("shape-rendering", "crispEdges"); // Prevent anti-aliasing for crisp grid lines

        chart.selectAll(".tick text")
            .style("font-size", 12)
            .style("font-family", "Times New Roman")
    }

    const populateEntities = () => {
        let chart = d3.select(`#bivariate-chart-${biVarName1}-${biVarName2}`);
        xScaleRef.current = d3.scaleLinear()
            .domain([biVariable1.min, biVariable1.max])
            .range([0, chartWidthRef.current]);
        yScaleRef.current = d3.scaleLinear()
            .domain([biVariable2.min, biVariable2.max])
            .range([chartHeightRef.current, 0]);

        console.log("populate entities in bivar");

        const specifiedEntities = Object.values(entities).filter(d => d[biVariable1.name] !== null && d[biVariable2.name] !== null && d[biVariable1.name] !== undefined && d[biVariable2.name] !== undefined);

        chart.selectAll(".bivar-dot").remove();

        specifiedEntities.forEach(entity => {
            chart.append("circle")
                .datum(entity)
                .attr("id", `bivar-dot-${entity.id}`)
                .attr("class", "bivar-dot")
                .attr("cx", d => xScaleRef.current(d[biVariable1.name]))
                .attr("cy", d => yScaleRef.current(d[biVariable2.name]))
                .attr("r", dotRadius)
        });

        // Add brush selection
        const brush = d3.brush()
            .extent([[0, 0], [chartWidthRef.current, chartHeightRef.current]])
            .on("start brush end", (event) => {
                if (event.sourceEvent === null) return;
                brushed(event);
            });

        chart.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, null);

        function brushed(event) {
            const { selection } = event;
            const currentSelections = new Map(selectionsRef.current);

            if (selection === null) {
                // If brush is cleared, only remove selections for these two variables
                currentSelections.delete(biVariable1.name);
                currentSelections.delete(biVariable2.name);
            }
            else {
                // Update selections
                const [[x0, y0], [x1, y1]] = selection;
                currentSelections.set(biVariable1.name, [xScaleRef.current.invert(x1), xScaleRef.current.invert(x0)]);
                currentSelections.set(biVariable2.name, [yScaleRef.current.invert(y0), yScaleRef.current.invert(y1)]);
            }

            selectionsRef.current = currentSelections;
            updateSelections(selectionsRef.current, SELECTION_SOURCES.BIVARIATE);
        }

        updateHighlightedEntities();
    }

    const updateHighlightedEntities = () => {
        let chart = d3.select(`#bivariate-chart-${biVarName1}-${biVarName2}`);
        const newSelectedEntities = [];

        // Update dots based on whether they fall within the brush selection
        Object.entries(entities).forEach(([entityId, entity]) => {
            if (entity[biVariable1.name] === null || entity[biVariable1.name] === undefined || entity[biVariable2.name] === null || entity[biVariable2.name] === undefined) {
                return;
            }

            const active = selectionsRef.current.size !== 0 && Array.from(selectionsRef.current).every(([key, [max, min]]) => {
                if (entity[key] === null) return false;
                return entity[key] >= min && entity[key] <= max;
            });

            const isEntityHidden = isHidden(entity);

            if (isEntityHidden) {
                chart.select(`#bivar-dot-${entityId}`)
                    .classed("hidden-dot", true)
                    .classed("selection-dot", false)
                    .classed("non-selection-dot", false);
            }
            else {
                chart.select(`#bivar-dot-${entityId}`)
                    .classed("hidden-dot", false)
                    .classed("selection-dot", active)
                    .classed("non-selection-dot", !active);

                if (active) {
                    newSelectedEntities.push(entity);
                }
            }
        });

        // Add potential entities
        chart.selectAll(".potential-dot").remove();
        potentialEntities.forEach(entity => {
            if (entity[biVariable1.name] === null || entity[biVariable1.name] === undefined || entity[biVariable2.name] === null || entity[biVariable2.name] === undefined) {
                return;
            }

            chart.append("circle")
                .datum(entity)
                .attr("id", `bivar-dot-${entity.id}`)
                .attr("class", "bivar-dot potential-dot")
                .attr("cx", d => xScaleRef.current(d[biVariable1.name]))
                .attr("cy", d => yScaleRef.current(d[biVariable2.name]))
                .attr("r", dotRadius)
        });

        chart.selectAll(".non-selection-dot").raise();
        chart.selectAll(".selection-dot").raise();
        chart.selectAll(".potential-dot").raise();

        return newSelectedEntities;
    }

    return (
        <Box
            id={`bivariate-distribution-div-${biVarName1}-${biVarName2}`}
            sx={{
                boxSizing: 'border-box',
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}
        >
        </Box >
    )
}