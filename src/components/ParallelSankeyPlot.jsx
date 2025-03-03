import React, { useState, useRef, useEffect, forwardRef } from 'react';
import * as d3 from 'd3';
import axios from "axios";
import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, FormLabel, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Radio, RadioGroup, Snackbar, Switch, ToggleButton, Typography } from '@mui/material';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DndContext, closestCenter, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import "./ParallelSankeyPlot.css";

/**
 * Define interaction types
 * 
 * TYPES:
 * - EXPLORE: For exploring complete patterns
 * - CONNECT: For connecting incomplete patterns
 * - ADD: For adding new points
 */
const INTERACTION_TYPES = {
    EXPLORE: "explore",
    CONNECT: "connect"
}

export default function ParallelSankeyPlot({ activePanel, variablesDict, updateVariable, entities, addEntities, deleteEntities, combineEntities, synchronizeSankeySelection }) {
    const marginTop = 20;
    const marginBottom = 10;
    const marginRight = 50;
    const marginLeft = 50;
    const labelOffset = 20;

    const [brushSelectedRegions, setBrushSelectedRegions] = useState(new Map());
    const selectedEntitiesRef = useRef([]);
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [sortableVariables, setSortableVariables] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [connectedPoint, setConnectedPoint] = useState(null);

    const [generatedNum, setGeneratedNum] = useState(5);

    const [activeInteraction, setActiveInteraction] = useState(INTERACTION_TYPES.EXPLORE);
    const activeInteractionRef = useRef(INTERACTION_TYPES.EXPLORE);

    const [isBatchMode, setIsBatchMode] = useState(true);
    const isBatchModeRef = useRef(true);

    const valueAxesRef = useRef(new Map());
    const variableAxesRef = useRef(null);

    const [warningMessage, setWarningMessage] = useState("");

    const chartHeightRef = useRef(0);

    const [selectionGroup, setSelectionGroup] = useState("selection-group-1");
    const selectionGroupRef = useRef("selection-group-1");
    const selectionGroup1EntitiesRef = useRef([]);
    const selectionGroup2EntitiesRef = useRef([]);


    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
        drawPlot();
        populateEntities();
    }, [activePanel, variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    const drawPlot = () => {
        const container = d3.select("#plot-container");
        const interactionModeBox = d3.select("#interaction-mode-box");
        const sortableContainer = d3.select("#sortable-container");
        const plotDiv = d3.select("#sankey-div");
        plotDiv.html("");

        const containerHeight = container.node().clientHeight;
        const interactionModeBoxHeight = interactionModeBox.node().clientHeight;
        const sortableContainerHeight = sortableContainer.node().clientHeight;

        const svgWidth = plotDiv.node().clientWidth;
        const svgHeight = containerHeight - interactionModeBoxHeight - sortableContainerHeight;
        let svg = plotDiv.append("svg")
            .attr("id", "sankey-svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);
        let chart = svg.append("g")
            .attr("id", "pcp")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);
        let chartWidth = svgWidth - marginLeft - marginRight;
        let chartHeight = svgHeight - marginTop - marginBottom;
        chartHeightRef.current = chartHeight;

        const newValueAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => {
            const dataRange = variable.max - variable.min;
            const padding = dataRange * 0.1;

            return [
                varName,
                {
                    scale: d3.scaleLinear()
                        .domain([variable.min - padding, variable.max + padding])
                        .range([chartHeight, 0]),
                    originalDomain: [variable.min, variable.max]
                }
            ];
        }));

        const newVariableAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([0, chartWidth]);

        // Append the axis for each key.
        chart.append("g")
            .selectAll("g")
            .data(Object.entries(variablesDict).map(([varName, variable]) => varName))
            .join("g")
            .attr("class", "axis")
            .attr("transform", d => `translate(${newVariableAxes(d)}, 0)`)
            .each(function (d) {
                const axisGroup = d3.select(this);
                const axisGenerator = d3.axisLeft(newValueAxes.get(d).scale);
                axisGroup.call(axisGenerator);
                const [min, max] = newValueAxes.get(d).originalDomain;

                // Get the y positions for the original min and max
                const yMin = newValueAxes.get(d).scale(min);
                const yMax = newValueAxes.get(d).scale(max);

                // Add dashed lines for padding regions
                axisGroup.append("line")
                    .attr("class", "axis-padding")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", chartHeight)
                    .attr("y2", yMin)
                    .style("stroke", "#999")
                    .style("stroke-dasharray", "2,2");

                axisGroup.append("line")
                    .attr("class", "axis-padding")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", 0)
                    .attr("y2", yMax)
                    .style("stroke", "#999")
                    .style("stroke-dasharray", "2,2");

                // Add solid line for main region
                axisGroup.append("line")
                    .attr("class", "axis-main")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", yMax)
                    .attr("y2", yMin)
                    .style("stroke", "black");

                // Style the ticks based on whether they're in the padding region
                axisGroup.selectAll(".tick")
                    .each(function (tickValue) {
                        if (tickValue < min || tickValue > max) {
                            d3.select(this)
                                .select("line")
                                .style("stroke", "#999")
                                .style("stroke-dasharray", "2,2");
                            d3.select(this)
                                .select("text")
                                .style("fill", "#999");
                        }
                    });

                // Remove the original axis line
                axisGroup.select(".domain").remove();

                // Add draggable handles at min and max
                const handleWidth = 20;
                const handleHeight = 8;

                // Create drag behavior
                const drag = d3.drag()
                    .on("drag", function (event, type) {
                        const handle = d3.select(this);
                        const newY = Math.min(Math.max(0, event.y), chartHeight);
                        handle.attr("transform", `translate(0, ${newY})`);

                        // Update the value label
                        const value = newValueAxes.get(d).scale.invert(newY);
                        handle.select("text")
                            .text(value.toFixed(2));
                    })
                    .on("end", function (event) {
                        const handle = d3.select(this);
                        const newY = Math.min(Math.max(0, event.y), chartHeight);
                        const newValue = newValueAxes.get(d).scale.invert(newY);

                        // Determine if this is min or max handle based on y position
                        const [currentMin, currentMax] = newValueAxes.get(d).originalDomain;
                        const isMinHandle = Math.abs(newValueAxes.get(d).scale(currentMin) - newY) <
                            Math.abs(newValueAxes.get(d).scale(currentMax) - newY);

                        // Update the variable's range
                        if (isMinHandle) {
                            updateVariable(d, {
                                min: newValue,
                                max: currentMax
                            });
                        } else {
                            updateVariable(d, {
                                min: currentMin,
                                max: newValue
                            });
                        }
                    });

                // Add min handle
                const minHandle = axisGroup.append("g")
                    .attr("class", "axis-handle")
                    .attr("transform", `translate(0, ${yMin})`)
                    .call(drag)
                    .on("mouseover", function () {
                        // trigger a tooltip
                        d3.select(this)
                            .append("title")
                            .text(() => {
                                const y = d3.select(this).attr("transform").match(/translate\(0,\s*([^)]+)\)/)[1];
                                return `Min: ${newValueAxes.get(d).scale.invert(y).toFixed(2)}`;
                            });
                    })
                    .on("mouseout", function () {
                        // hide the tooltip
                        d3.select(this).select("title").remove();
                    });

                minHandle.append("rect")
                    .attr("x", -handleWidth / 2)
                    .attr("y", -handleHeight / 2)
                    .attr("width", handleWidth)
                    .attr("height", handleHeight)

                // Add max handle
                const maxHandle = axisGroup.append("g")
                    .attr("class", "axis-handle")
                    .attr("transform", `translate(0, ${yMax})`)
                    .call(drag)
                    .on("mouseover", function () {
                        // trigger a tooltip
                        d3.select(this)
                            .append("title")
                            .text(() => {
                                const y = d3.select(this).attr("transform").match(/translate\(0,\s*([^)]+)\)/)[1];
                                return `Max: ${newValueAxes.get(d).scale.invert(y).toFixed(2)}`;
                            });
                    })
                    .on("mouseout", function () {
                        // hide the tooltip
                        d3.select(this).select("title").remove();
                    });

                maxHandle.append("rect")
                    .attr("x", -handleWidth / 2)
                    .attr("y", -handleHeight / 2)
                    .attr("width", handleWidth)
                    .attr("height", handleHeight)
            })

        // Update references but use only the scale part
        valueAxesRef.current = new Map(Array.from(newValueAxes.entries()).map(([key, value]) => [key, value.scale]));
        variableAxesRef.current = newVariableAxes;
    }

    const changeBatchMode = (enabled) => {
        setIsBatchMode(enabled);
        isBatchModeRef.current = enabled;

        // Reapply the current interaction mode with new batch setting
        changeInteractionMode(activeInteractionRef.current);
    }

    const changeInteractionMode = (interactionType) => {
        console.log("Change interaction mode to: ", interactionType);
        activeInteractionRef.current = interactionType;
        setActiveInteraction(interactionType);

        clearBrushSelection();

        // Filter entities based on interaction type
        Object.entries(entities).forEach(([entityId, entity]) => {
            const isComplete = sortableVariables.every(variable => entity[variable.name] !== null);

            if (interactionType === INTERACTION_TYPES.EXPLORE) {
                // In Explore mode: show only complete entities
                d3.select(`#entity_path_${entityId}`)
                    .classed("brush-non-selection", isComplete)
                    .classed("hidden-selection", !isComplete);

                // Update associated dots
                Object.entries(entity).forEach(([key, value]) => {
                    if (key !== "id" && value !== null) {
                        d3.select(`#dot_${entity["id"]}_${key}`)
                            .classed("unselected-entity-dot", isComplete)
                            .classed("hidden-entity-dot", !isComplete);
                    }
                });
            } else if (interactionType === INTERACTION_TYPES.CONNECT) {
                // In Connect mode: show only incomplete entities
                d3.select(`#entity_path_${entityId}`)
                    .classed("brush-non-selection", !isComplete)
                    .classed("hidden-selection", isComplete);

                // Update associated dots
                Object.entries(entity).forEach(([key, value]) => {
                    if (key !== "id" && value !== null) {
                        d3.select(`#dot_${entity["id"]}_${key}`)
                            .classed("unselected-entity-dot", !isComplete)
                            .classed("hidden-entity-dot", isComplete);
                    }
                });
            }
        })

        if (isBatchModeRef.current) {
            // Batch mode: use brush selection
            activateBrushFeature();
        }
        // else {
        //     // Individual mode: use click interactions
        //     if (interactionType === INTERACTION_TYPES.EXPLORE) {
        //         // addAxisRegion();
        //         activateAddFeature();
        //     } else if (interactionType === INTERACTION_TYPES.CONNECT) {
        //         activateConnectFeature();
        //     }
        // }

        d3.selectAll(".unselected-entity-dot").raise();

        // Reset selections when changing modes
        setBrushSelectedRegions(new Map());
        setSelectedEntities([]);
    }

    const clearInteractions = () => {
        const svg = d3.select("#sankey-svg");

        // Remove Add feature interactions
        svg.selectAll(".axis-region").remove();
        svg.selectAll(".temp-circle").remove();
        svg.selectAll(".temp-line").remove();

        // Remove Connect feature interactions
        svg.selectAll(".entity-dot")
            .on("mouseover", null)
            .on("mouseout", null)
            .on("click", null);
        setConnectedPoint(null);

        // Remove brush feature interactions
        svg.selectAll(".axis")
            .on("mousedown.brush mousemove.brush mouseup.brush", null);
        svg.selectAll(".selection").remove();
        svg.selectAll(".handle").remove();
        svg.selectAll(".overlay").remove();
        svg.on("start brush end", null);
        setBrushSelectedRegions(new Map());

        // Clear selected entities ref
        selectedEntitiesRef.current = [];
        setSelectedEntities([]);
    }

    const clearBrushSelection = () => {
        const svg = d3.select("#sankey-svg");

        // Clear brush selection by calling brush.move with null
        svg.selectAll(".axis")
            .on("mousedown.brush mousemove.brush mouseup.brush", null);
        svg.selectAll(".selection").remove();
        svg.selectAll(".handle").remove();
        svg.selectAll(".overlay").remove();
        svg.on("start brush end", null);
        svg.selectAll(".selection-count-label").remove();

        setBrushSelectedRegions(new Map());

        // Clear selected entities ref
        selectedEntitiesRef.current = [];
        setSelectedEntities([]);
    }

    const addAxisRegion = () => {
        const svg = d3.select("#sankey-svg");

        svg.selectAll(".axis")
            .append("rect")
            .attr("class", "axis-region")
            .attr("x", -10)
            .attr("y", marginTop)
            .attr("width", 20)
            .attr("height", chartHeightRef.current - marginTop - marginBottom)
            .attr("fill", "transparent")
            .attr("pointer-events", "all")
    }

    const populateEntities = () => {
        console.log("Populate entities in PCP", entities);

        const chart = d3.select("#pcp");

        // Draw path for the entity
        const line = d3.line()
            // .defined(([, value]) => value != null)
            .x(([key]) => variableAxesRef.current(key))
            .y(([key, value]) => valueAxesRef.current.get(key)(value));

        chart.selectAll(".entity-path").remove();
        chart.selectAll(".entity-dot").remove();

        /**
         * Draw entities
         * 
         * Draw circles for values on each axis
         * Draw path for entities across axes
         * 
         */
        Object.values(entities).forEach(entity => {
            Object.entries(entity).filter(([key, value]) => key !== "id" && value !== null).forEach(([key, value]) => {
                chart.append("circle")
                    .attr("class", "entity-dot")
                    .attr("id", `dot_${entity["id"]}_${key}`)
                    .attr("cx", variableAxesRef.current(key))
                    .attr("cy", valueAxesRef.current.get(key)(value))
                    .attr("r", 4)

            });

            chart.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path")
                .attr("id", `entity_path_${entity["id"]}`)
                .attr("d", d => line(
                    sortableVariables
                        .filter(variable => d[variable.name] !== null)
                        .map(variable => [variable.name, d[variable.name]])
                ))
        });

        chart.selectAll(".entity-dot")
            .raise();

        changeInteractionMode(activeInteractionRef.current);
    }

    const activateAddFeature = () => {
        const svg = d3.select("#sankey-svg");
        const axisNum = Object.keys(variablesDict).length;
        let selectedPoints = new Array(axisNum).fill(null);

        svg.selectAll(".axis-region")
            .on("click", function (event, d) {
                svg.selectAll(".temp-circle").remove();
                svg.selectAll(".temp-line").remove();

                const [x, y] = d3.pointer(event);
                const axisValue = d;

                const varValue = valueAxesRef.current.get(axisValue).invert(y);
                const axisIndex = variableAxesRef.current.domain().indexOf(axisValue);

                selectedPoints[axisIndex] = { val: varValue, axis: axisValue };
                let submitEntity = true;
                for (let i = 0; i < selectedPoints.length; i++) {
                    if (selectedPoints[i] !== null) {
                        svg.append("circle")
                            .attr("class", "temp-circle")
                            .attr("cx", variableAxesRef.current(selectedPoints[i].axis))
                            .attr("cy", valueAxesRef.current.get(selectedPoints[i].axis)(selectedPoints[i].val))
                            .attr("r", 4)
                            .attr("fill", "blue")

                        if (i < selectedPoints.length - 1 && selectedPoints[i + 1] !== null) {
                            svg.append("line")
                                .attr("class", "temp-line")
                                .attr("x1", variableAxesRef.current(selectedPoints[i].axis))
                                .attr("y1", valueAxesRef.current.get(selectedPoints[i].axis)(selectedPoints[i].val))
                                .attr("x2", variableAxesRef.current(selectedPoints[i + 1].axis))
                                .attr("y2", valueAxesRef.current.get(selectedPoints[i + 1].axis)(selectedPoints[i + 1].val))
                                .attr("stroke", "black")
                                .attr("stroke-width", 1);
                        }
                    }
                    else {
                        submitEntity = false;
                    }
                }

                if (submitEntity) {
                    let entityData = {};
                    for (let i = 0; i < selectedPoints.length; i++) {
                        entityData[selectedPoints[i].axis] = selectedPoints[i].val;
                    }

                    addEntities([entityData]);
                    selectedPoints = new Array(axisNum).fill(null);

                    // Remove all circles and lines
                    svg.selectAll(".temp-circle").remove();
                    svg.selectAll(".temp-line").remove();
                }
            });
    }

    /**
     * Connect feature:
     * 1. Select individual data points
     * 2. 
     * 
     * PROBLEM:
     * - what if user select non-neighboring data points?
     */
    const activateConnectFeature = () => {
        const svg = d3.select("#sankey-svg");
        let connectedPoint = null;

        svg.selectAll(".unselected-entity-dot")
            .on("mouseover", function () {
                d3.select(this).classed("hovered-entity-dot", true);
            })
            .on("mouseout", function () {
                d3.select(this).classed("hovered-entity-dot", false);
            })
            .on("click", function (event) {
                d3.select(this).classed("connect-entity-dot", true);
                const [_, clickEntityId, clickAxis] = d3.select(this).attr("id").split("_");

                /**
                 * If there is already a connnected point,
                 * - If these two points are on neighboring axes, draw a line between them
                 * - If these two points are not on neighboring axes, notify the user
                 * - If these two points are on the same axis, notify the user
                 */
                if (connectedPoint) {
                    const connectedEntity1 = { ...entities[connectedPoint.entityId] };
                    const connectedEntity2 = { ...entities[clickEntityId] };

                    let isDuplicate = false;
                    let combinedEntityData = {};

                    Object.keys(variablesDict).forEach((varName) => {
                        const value1 = connectedEntity1[varName];
                        const value2 = connectedEntity2[varName];

                        if (value1 !== null && value2 !== null) {
                            isDuplicate = true;
                        } else if (value1) {
                            combinedEntityData[varName] = value1;
                        } else if (value2) {
                            combinedEntityData[varName] = value2;
                        } else {
                            combinedEntityData[varName] = null;
                        }
                    });

                    if (isDuplicate) {
                        console.warn("Duplicate values detected on the same axis!");
                    }
                    else {
                        deleteEntities([
                            connectedEntity1["id"],
                            connectedEntity2["id"],
                        ]);
                        addEntities([combinedEntityData]);
                        console.log("Combined entity: ", combinedEntityData);
                    }

                    // Reset connectedPoint after combining
                    d3.selectAll(".entity-dot").classed("connect-entity-dot", false);

                    connectedPoint = null;
                }
                else {
                    connectedPoint = {
                        entityId: clickEntityId,
                        axis: clickAxis,
                    };
                    console.log("Set connected point: ", connectedPoint);
                }
            })
    }

    const activateBrushFeature = () => {
        const chart = d3.select("#pcp");
        const brushWidth = 50;
        const selections = new Map();

        const brush = d3.brushY()
            .extent([
                [-(brushWidth / 2), marginTop],
                [brushWidth / 2, chartHeightRef.current]
            ])
            .on("start brush end", (event, key) => {
                if (event.sourceEvent === null) return;
                brushed(event, key);
            });

        // Apply brush to axis groups
        chart.selectAll(".axis")
            .append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, null);

        function brushed(event, key) {
            // Only process brush events in batch mode
            if (!isBatchModeRef.current) return;

            const { selection } = event;

            if (selection === null) {
                selections.delete(key);
                chart.select(`#count-label-${key}`).remove();
                return;
            } else {
                selections.set(key, selection.map(valueAxesRef.current.get(key).invert));
            }

            const newSelectedEntities = [];
            const countsByAxis = new Map();
            Array.from(selections.keys()).forEach(axis => countsByAxis.set(axis, 0));

            chart.selectAll(".entity-path").each(function (d) {
                if (d) {
                    const active = Array.from(selections).every(([key, [max, min]]) => {
                        if (d[key] === null) return false;
                        return d[key] >= min && d[key] <= max;
                    });

                    const isComplete = sortableVariables.every(variable => d[variable.name] !== null);

                    let shouldSelect = false;
                    if (activeInteractionRef.current === INTERACTION_TYPES.CONNECT) {
                        // const hasPointInSelection = Array.from(selections).some(([key, [max, min]]) =>
                        //     d[key] !== null && d[key] >= min && d[key] <= max
                        // );
                        shouldSelect = active && !isComplete;
                    } else if (activeInteractionRef.current === INTERACTION_TYPES.EXPLORE) {
                        shouldSelect = active && isComplete;
                    }

                    if (selectionGroup1EntitiesRef.current.includes(d) || selectionGroup2EntitiesRef.current.includes(d)) {
                        return;
                    }

                    if (shouldSelect) {
                        if (activeInteractionRef.current === INTERACTION_TYPES.EXPLORE) {
                            d3.select(this)
                                .classed("brush-selection", true)
                                .classed("brush-non-selection", false)
                                .raise();

                            // Highlight associated dots
                            Object.entries(d).forEach(([key, value]) => {
                                if (key !== "id" && value !== null) {
                                    d3.select(`#dot_${d["id"]}_${key}`)
                                        .classed("selected-entity-dot", true)
                                        .classed("unselected-entity-dot", false)
                                        .raise();
                                }
                            });
                        }
                        else {
                            d3.select(this)
                                .classed("brush-selection", false)
                                .classed("brush-non-selection", false)
                                .classed("selection-group-1", selectionGroupRef.current === "selection-group-1")
                                .classed("selection-group-2", selectionGroupRef.current === "selection-group-2")
                                .raise();

                            // Highlight associated dots with group classes
                            Object.entries(d).forEach(([key, value]) => {
                                if (key !== "id" && value !== null) {
                                    d3.select(`#dot_${d["id"]}_${key}`)
                                        .classed("selected-entity-dot", false)
                                        .classed("unselected-entity-dot", false)
                                        .classed("selection-group-1-dot", selectionGroupRef.current === "selection-group-1")
                                        .classed("selection-group-2-dot", selectionGroupRef.current === "selection-group-2")
                                        .raise();
                                }
                            });
                        }

                        newSelectedEntities.push(d);

                        // Count points per axis for selected entities
                        Array.from(selections.keys()).forEach(axis => {
                            if (d[axis] !== null) {
                                const [max, min] = selections.get(axis);
                                if (d[axis] >= min && d[axis] <= max) {
                                    countsByAxis.set(axis, countsByAxis.get(axis) + 1);
                                }
                            }
                        });
                    } else {
                        // Reset all highlighting classes
                        d3.select(this)
                            .classed("brush-selection", false)
                            .classed("brush-non-selection", true)
                            .classed("selection-group-1", false)
                            .classed("selection-group-2", false);

                        // Reset all dot classes
                        Object.entries(d).forEach(([key, value]) => {
                            if (key !== "id" && value !== null) {
                                d3.select(`#dot_${d["id"]}_${key}`)
                                    .classed("selected-entity-dot", false)
                                    .classed("unselected-entity-dot", true)
                                    .classed("selection-group-1-dot", false)
                                    .classed("selection-group-2-dot", false);
                            }
                        });
                    }
                }
            });

            // Update both ref and state
            selectedEntitiesRef.current = newSelectedEntities;
            setSelectedEntities(newSelectedEntities);

            // Synchronize immediately with the new selection
            synchronizeSankeySelection(newSelectedEntities);

            // Update count labels for each axis
            countsByAxis.forEach((count, axis) => {
                // Remove existing label
                chart.select(`#count-label-${axis}`).remove();

                // Add new label if there's a selection
                if (selections.has(axis)) {
                    const axisX = variableAxesRef.current(axis);
                    const axisY = valueAxesRef.current.get(axis);
                    const [selectionY1, selectionY2] = selections.get(axis);
                    const labelY = (selectionY1 + selectionY2) / 2; // Middle of brush selection

                    chart.append("text")
                        .attr("id", `count-label-${axis}`)
                        .attr("class", "selection-count-label")
                        .attr("x", axisX + 15)
                        .attr("y", axisY(labelY))
                        .attr("dy", ".35em") // Vertical alignment
                        .text(`n = ${count}`)
                        .attr('font-size', '12px');
                }
            });

            chart.selectAll(".entity-dot").raise();
            chart.selectAll(".selection-count-label").raise();
            chart.selectAll(".axis-handle").raise();
            setBrushSelectedRegions(selections);
        }

        chart.selectAll(".axis-handle").raise();
    }

    const updateSelectionGroupEntities = () => {
        if (selectionGroupRef.current === "selection-group-1") {
            selectionGroup1EntitiesRef.current = selectedEntitiesRef.current;
        } else {
            selectionGroup2EntitiesRef.current = selectedEntitiesRef.current;
        }
    }

    const changeSelectionGroup = (group) => {
        updateSelectionGroupEntities();

        setSelectionGroup(group);
        selectionGroupRef.current = group;
        clearBrushSelection();
        activateBrushFeature();
    }

    const connectRandomEntities = () => {
        const entitiesInRegions = selectedEntitiesRef.current;

        // Group entities by axis to find points on each axis
        const pointsByAxis = new Map();
        Array.from(brushSelectedRegions.keys()).forEach(axis => {
            const [max, min] = brushSelectedRegions.get(axis);
            const pointsOnAxis = entitiesInRegions.filter(entity =>
                entity[axis] !== null &&
                entity[axis] >= min &&
                entity[axis] <= max
            );
            pointsByAxis.set(axis, pointsOnAxis);
        });

        // Check if all selected regions have the same number of points
        const pointCounts = Array.from(pointsByAxis.values()).map(points => points.length);
        const allSameCount = pointCounts.every(count => count === pointCounts[0]);

        if (!allSameCount) {
            setWarningMessage("Selected regions must have the same number of available points for 1-to-1 mapping");
            return;
        }

        // For 1-to-1 mapping between points
        const selectedAxes = Array.from(brushSelectedRegions.keys());
        const pointsPerAxis = pointCounts[0];
        const newEntities = [];
        const pointsToDelete = [];

        // For each set of points to connect
        for (let i = 0; i < pointsPerAxis; i++) {
            const combinedEntity = {};

            // Get one point from each axis
            selectedAxes.forEach(axis => {
                const point = pointsByAxis.get(axis)[i];
                combinedEntity[axis] = point[axis];
                pointsToDelete.push(point.id);
            });

            newEntities.push(combinedEntity);
        }

        deleteEntities(pointsToDelete);
        addEntities(newEntities);
    }

    const connectEntities = () => {
        updateSelectionGroupEntities();

        const entities1 = [...selectionGroup1EntitiesRef.current];
        const entities2 = [...selectionGroup2EntitiesRef.current];

        // Return if either group is empty
        if (entities1.length === 0 || entities2.length === 0) {
            return;
        }

        // Check if groups have equal length
        if (entities1.length !== entities2.length) {
            setWarningMessage("Both selection groups must have the same number of entities");
            return;
        }

        const newEntities = [];
        const entitiesToDelete = [];

        // Combine all pairs
        while (entities1.length > 0) {
            // Randomly select one entity from each group without replacement
            const randomIndex1 = Math.floor(Math.random() * entities1.length);
            const randomIndex2 = Math.floor(Math.random() * entities2.length);
            const randomEntity1 = entities1.splice(randomIndex1, 1)[0];
            const randomEntity2 = entities2.splice(randomIndex2, 1)[0];

            // Combine the entities
            let combinedEntityData = {};
            Object.keys(variablesDict).forEach((varName) => {
                const value1 = randomEntity1[varName];
                const value2 = randomEntity2[varName];

                if (value1) {
                    combinedEntityData[varName] = value1;
                } else if (value2) {
                    combinedEntityData[varName] = value2;
                } else {
                    combinedEntityData[varName] = null;
                }
            });

            newEntities.push(combinedEntityData);
            entitiesToDelete.push(randomEntity1.id, randomEntity2.id);
        }

        // Update the refs with empty arrays since all entities are used
        selectionGroup1EntitiesRef.current = [];
        selectionGroup2EntitiesRef.current = [];

        // Use the new combineEntities function instead of separate delete and add
        combineEntities(entitiesToDelete, newEntities);

        setSelectionGroup("selection-group-1");
        selectionGroupRef.current = "selection-group-1";
    }

    // Randomly populate data points in the selected region
    const generateRandomEntities = () => {
        const newEntitiesData = [];
        for (let i = 0; i < generatedNum; i++) {
            let entityData = {};
            Array.from(brushSelectedRegions).forEach(([varName, range]) => {
                const [min, max] = range;
                const randomValue = Math.random() * (max - min) + min;
                entityData[varName] = randomValue;
            });
            newEntitiesData.push(entityData);
        }

        addEntities(newEntitiesData);
    }

    const deleteSelectedEntities = () => {
        deleteEntities(selectedEntitiesRef.current.map(entity => entity.id));
    }

    const handleDragStart = (event) => {
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
                    updateVariable(item.name, {
                        "sequenceNum": index
                    });
                });

                return newItems;
            });
        }

        setDraggedItem(null);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    return (
        <Box id="plot-container" sx={{ boxSizing: 'border-box', height: "100%" }}>
            <Box id="interaction-mode-box" sx={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2
            }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: 'grey.500',
                    borderRadius: 1,
                    p: 1
                }}>
                    <Typography sx={{ mr: 1.5 }}>Interaction Mode:</Typography>
                    <RadioGroup
                        row
                        aria-label="interactionMode"
                        name="interactionMode"
                        value={activeInteraction}
                        onChange={(event) => changeInteractionMode(event.target.value)}
                    >
                        <FormControlLabel
                            value={INTERACTION_TYPES.EXPLORE}
                            control={<Radio />}
                            label="Completed"
                        />
                        <FormControlLabel
                            value={INTERACTION_TYPES.CONNECT}
                            control={<Radio />}
                            label="Incompleted"
                        />
                    </RadioGroup>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', ml: 2 }}>
                    {activeInteraction === INTERACTION_TYPES.EXPLORE && isBatchMode && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Box sx={{ mx: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Button
                                    sx={{ mb: 1 }}
                                    disabled={
                                        (isBatchMode && (brushSelectedRegions.size === 0 || activeInteraction !== INTERACTION_TYPES.EXPLORE)) ||
                                        (!isBatchMode)
                                    }
                                    variant='outlined'
                                    onClick={generateRandomEntities}>
                                    Generate
                                </Button>
                                <input
                                    type="number"
                                    value={generatedNum}
                                    onChange={(e) => setGeneratedNum(Number(e.target.value))}
                                    min="1"
                                    style={{ width: '60px', textAlign: 'center' }}
                                />
                            </Box>
                            <Button
                                disabled={selectedEntities.length === 0}
                                variant='outlined'
                                onClick={deleteSelectedEntities}>
                                Delete
                            </Button>
                        </Box>
                    )}

                    {activeInteraction === INTERACTION_TYPES.CONNECT && isBatchMode && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Box sx={{ mx: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Button
                                    variant='outlined'
                                    onClick={connectEntities}>
                                    Link
                                </Button>
                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                    <ToggleButton
                                        value="group1"
                                        selected={selectionGroup === "selection-group-1"}
                                        onChange={() => {
                                            changeSelectionGroup("selection-group-1");
                                        }}
                                    >
                                        Group 1
                                    </ToggleButton>
                                    <ToggleButton
                                        value="group2"
                                        selected={selectionGroup === "selection-group-2"}
                                        onChange={() => {
                                            changeSelectionGroup("selection-group-2");
                                        }}
                                    >
                                        Group 2
                                    </ToggleButton>
                                </Box>
                            </Box>
                            <Button
                                sx={{ ml: 1 }}
                                disabled={selectedEntities.length === 0}
                                variant='outlined'
                                onClick={deleteSelectedEntities}>
                                Delete
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={sortableVariables}
                    strategy={verticalListSortingStrategy}
                >
                    <Box id='sortable-container' sx={{ width: '100%', minHeight: '40px', display: 'flex', flexDirection: 'row', position: 'relative' }}>
                        {sortableVariables.map(item => {
                            const axisPosition = variableAxesRef.current(item.name) + marginLeft;

                            return (
                                <SortableItem
                                    key={item.name}
                                    id={item.name}
                                    axisPosition={axisPosition}
                                    activeInteraction={activeInteraction}
                                />
                            )
                        })}
                    </Box>
                </SortableContext>
                <DragOverlay>
                    {draggedItem ? <Item id={draggedItem} /> : null}
                </DragOverlay>
            </DndContext>

            <Box
                sx={{
                    boxSizing: 'content-box',
                    mx: 'auto',
                    width: '100%',
                }}
                id='sankey-div'
            />

            <Snackbar
                open={warningMessage !== ""}
                autoHideDuration={4000}
                onClose={() => setWarningMessage("")}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity="error"
                    sx={{ width: '100%' }}
                >
                    {warningMessage}
                </Alert>
            </Snackbar>
        </Box>
    )
}

export const SortableItem = forwardRef(({ id, axisPosition, activeInteraction }, ref) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id, });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Item
            ref={setNodeRef}
            id={id}
            axisPosition={axisPosition}
            activeInteraction={activeInteraction}
            style={style}
            {...attributes}
            {...listeners}
        />
    );
});

export const Item = forwardRef(({ id, axisPosition, activeInteraction, ...props }, ref) => {

    return (
        <Box {...props}
            ref={ref}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: axisPosition,
                transform: 'translateX(-50%)'
            }}
        >
            <DragHandleIcon size='small' />
            <Typography variant='caption'>{id}</Typography>
        </Box>
    )
});