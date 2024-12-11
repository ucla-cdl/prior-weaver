import React, { useState, useRef, useEffect, forwardRef } from 'react';
import * as d3 from 'd3';
import axios from "axios";
import { Box, Button, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ParallelSankeyPlot({ variablesDict, updateVariable, entities, updateEntities, synchronizeSankeySelection }) {

    const marginTop = 20;
    const marginRight = 10;
    const marginBottom = 20;
    const marginLeft = 10;

    const [brushSelections, setBrushSelections] = useState(new Map());
    const [sortableVariables, setSortableVariables] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
        drawParallelSankeyPlot();
        populateEntities();
    }, [variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    const populateEntities = () => {
        const divId = "sankey-div";
        const chartWidth = document.getElementById(divId).clientWidth;
        const axisNum = Object.keys(variablesDict).length;
        const chartHeight = axisNum * 120;

        const svg = d3.select("#sankey-svg");
        const xAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => [
            varName,
            d3.scaleLinear()
                .domain([variable.min, variable.max])
                .range([marginLeft, chartWidth - marginRight])
        ]));

        const yAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum)
                    .map(d => d.name))
            .range([marginTop, chartHeight - marginBottom]);

        // Draw path for the entity
        const line = d3.line()
            .defined(([, value]) => value != null)
            .x(([key, value]) => xAxes.get(key)(value))
            .y(([key]) => yAxes(key));

        svg.selectAll(".entity-path").remove();
        entities?.forEach(entity => {
            svg.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("stroke-opacity", 0.4)
                .attr("d", d => line(Object.entries(d))); // Convert entity to entries for line function
        });
    }

    const drawParallelSankeyPlot = () => {
        const divId = "sankey-div";
        document.getElementById(divId).innerHTML = "";
        const chartWidth = document.getElementById(divId).clientWidth;
        const axisNum = Object.keys(variablesDict).length;
        const chartHeight = axisNum * 120;

        let svg = d3.select("#" + divId).append("svg")
            .attr("id", "sankey-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        const xAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => [
            varName,
            d3.scaleLinear()
                .domain([variable.min, variable.max])
                .range([marginLeft, chartWidth - marginRight])
        ]));

        const yAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([marginTop, chartHeight - marginBottom]);

        // Append the axis for each key.
        const axes = svg.append("g")
            .selectAll("g")
            .data(Object.entries(variablesDict).map(([varName, variable]) => varName))
            .join("g")
            .attr("transform", d => `translate(0,${yAxes(d)})`)
            .each(function (d) {
                d3.select(this).call(d3.axisBottom(xAxes.get(d)));
            })
            .call(g => g.append("text")
                .attr("x", marginLeft)
                .attr("y", -6)
                .attr("text-anchor", "start")
                .attr("fill", "black")
                .text(d => d))
            .call(g => g.selectAll("text")
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke-width", 5)
                .attr("stroke-linejoin", "round")
                .attr("stroke", "white"))

        // create line behavior
        let selectedPoints = new Array(axisNum).fill(null);
        axes.on("click", function (event, d) {
            svg.selectAll(".temp-circle").remove();
            svg.selectAll(".temp-line").remove();

            const [x, y] = d3.pointer(event);
            const yValue = d;
            const xValue = xAxes.get(yValue).invert(x);

            const closestIndexY = yAxes.domain().indexOf(yValue);
            selectedPoints[closestIndexY] = { x: xValue, y: yValue };
            let submitEntity = true;
            for (let i = 0; i < selectedPoints.length; i++) {
                if (selectedPoints[i] !== null) {
                    svg.append("circle")
                        .attr("class", "temp-circle")
                        .attr("cx", xAxes.get(selectedPoints[i].y)(selectedPoints[i].x))
                        .attr("cy", yAxes(selectedPoints[i].y))
                        .attr("r", 4)
                        .attr("fill", "blue")
                        .append("title")
                        .text(`x: ${(selectedPoints[i].x).toFixed(2)}`);

                    if (i < selectedPoints.length - 1 && selectedPoints[i + 1] !== null) {
                        svg.append("line")
                            .attr("class", "temp-line")
                            .attr("x1", xAxes.get(selectedPoints[i].y)(selectedPoints[i].x))
                            .attr("y1", yAxes(selectedPoints[i].y))
                            .attr("x2", xAxes.get(selectedPoints[i + 1].y)(selectedPoints[i + 1].x))
                            .attr("y2", yAxes(selectedPoints[i + 1].y))
                            .attr("stroke", "black")
                            .attr("stroke-width", 1);
                    }
                }
                else {
                    submitEntity = false;
                }
            }

            if (submitEntity) {
                let entity = {};
                for (let i = 0; i < selectedPoints.length; i++) {
                    entity[selectedPoints[i].y] = selectedPoints[i].x;
                }

                // // Draw path for the entity
                // const line = d3.line()
                //     .defined(([, value]) => value != null)
                //     .x(([key, value]) => xAxes.get(key)(value))
                //     .y(([key]) => yAxes(key));

                // svg.append("path")
                //     .datum(entity) // Pass the entity directly
                //     .attr("fill", "none")
                //     .attr("stroke", "steelblue")
                //     .attr("stroke-width", 1.5)
                //     .attr("stroke-opacity", 0.4)
                //     .attr("d", d => line(Object.entries(d))); // Convert entity to entries for line function

                updateEntities(entity);
                selectedPoints = new Array(axisNum).fill(null);
                console.log("submit", entity);

                // Remove all circles and lines
                svg.selectAll(".temp-circle").remove();
                svg.selectAll(".temp-line").remove();
            }
        });

        // Brush feature
        const deselectedColor = "#ddd";
        const selectedColor = "steelblue";
        const brushHeight = 50;
        const brush = d3.brushX()
            .extent([
                [marginLeft, -(brushHeight / 2)],
                [chartWidth - marginRight, brushHeight / 2]
            ])
            .on("start brush end", brushed);

        axes.call(brush);
        const selections = new Map();

        function brushed(event, key) {
            const { selection } = event;

            if (selection === null) {
                selections.delete(key);
            } else {
                selections.set(key, selection.map(xAxes.get(key).invert));
            }
            const selected = [];
            svg.selectAll("path").each(function (d) {
                if (d) {
                    const active = Array.from(selections).every(([key, [min, max]]) => d[key] >= min && d[key] <= max);
                    d3.select(this).style("stroke", active ? selectedColor : deselectedColor);
                    if (active) {
                        d3.select(this).raise();
                        selected.push(d);
                    }
                }
            });
            svg.node().value = selected;
            svg.dispatch("input");
            setBrushSelections(selections);
        }

        svg.node().value = entities;

        svg.on("input", function () {
            const selectedEntities = svg.node().value;
            console.log("selectedEntities", selectedEntities);
            synchronizeSankeySelection(selectedEntities);
        });
    }

    const autoPopulateEntities = () => {
        const newEntitiesNum = 10;
        const newEntities = [];
        for (let i = 0; i < newEntitiesNum; i++) {
            let entity = {};
            Array.from(brushSelections).forEach(([varName, range]) => {
                const [min, max] = range;
                const randomValue = Math.random() * (max - min) + min;
                entity[varName] = randomValue;
            });
            newEntities.push(entity);
        }

        updateEntities(newEntities);
    }

    function handleDragStart(event) {
        setDraggedItem(event.active.id);
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setSortableVariables((items) => {
                const oldIndex = items.findIndex(item => item.name === active.id);
                const newIndex = items.findIndex(item => item.name === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);
                newItems.forEach((item, index) => {
                    updateVariable(item.name, "sequenceNum", index);
                });

                return newItems;
            });
        }

        setDraggedItem(null);
    };

    return (
        <div>
            <Button onClick={autoPopulateEntities}>Auto Populate Entities</Button>

            <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={sortableVariables}
                    strategy={verticalListSortingStrategy}
                >
                    {sortableVariables.map(item => {
                        return (
                            <SortableItem key={item.name} id={item.name} item={item} />
                        )
                    })}
                </SortableContext>
                <DragOverlay>
                    {draggedItem ? <Item id={draggedItem} /> : null}
                </DragOverlay>
            </DndContext>

            <div id='sankey-div'>

            </div>
        </div>
    )
}

export function SortableItem({ id, item }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Item ref={setNodeRef} id={id} style={style} {...attributes} {...listeners} />
    );
}

export const Item = forwardRef(({ id, ...props }, ref) => {
    return (
        <Box {...props} ref={ref} sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <DragHandleIcon />
            <p>{id}</p>
        </Box>
    )
});