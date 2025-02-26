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

export default function ParallelSankeyPlot({ variablesDict, updateVariable, entities, addEntities, deleteEntities, updateEntities, synchronizeSankeySelection }) {
    const marginTop = 20;
    const marginBottom = 30;
    const marginRight = 80;
    const marginLeft = 80;
    const labelOffset = 25;
    const chartHeight = 350;

    const [brushSelectedRegions, setBrushSelectedRegions] = useState(new Map());
    const selectedEntitiesRef = useRef([]);
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [sortableVariables, setSortableVariables] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [connectedPoint, setConnectedPoint] = useState(null);

    const [generatedNum, setGeneratedNum] = useState(5);

    const [activeInteraction, setActiveInteraction] = useState(INTERACTION_TYPES.EXPLORE);
    const activeInteractionRef = useRef(INTERACTION_TYPES.EXPLORE);
    const [axesFilterStatus, setAxesFilterStatus] = useState({});

    const [isBatchMode, setIsBatchMode] = useState(false);
    const isBatchModeRef = useRef(false);

    const valueAxesRef = useRef(new Map());
    const variableAxesRef = useRef(null);

    const [warningMessage, setWarningMessage] = useState("");

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
        setAxesFilterStatus(Object.keys(variablesDict).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {}));
        updatePlotLayout();

        populateEntities();
    }, [variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    const updatePlotLayout = () => {
        const divId = "sankey-div";
        document.getElementById(divId).innerHTML = "";
        const axisNum = Object.keys(variablesDict).length;
        // const chartWidth = axisNum * 140;
        const chartWidth = d3.select("#" + divId).node().getBoundingClientRect().width;

        let svg = d3.select("#" + divId).append("svg")
            .attr("id", "sankey-svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        const newValueAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => [
            varName,
            d3.scaleLinear()
                .domain([variable.min, variable.max])
                .range([chartHeight - marginBottom, marginTop])
        ]));

        const newVariableAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([marginLeft, chartWidth - marginRight]);

        // Append the axis for each key.
        svg.append("g")
            .selectAll("g")
            .data(Object.entries(variablesDict).map(([varName, variable]) => varName))
            .join("g")
            .attr("transform", d => `translate(${newVariableAxes(d)}, 0)`)
            .each(function (d) {
                d3.select(this).call(d3.axisLeft(newValueAxes.get(d)));
            })
            .attr("class", "axis")
            .call(g => g.append("text")
                .attr("x", 0)
                .attr("y", chartHeight - marginBottom + labelOffset)
                .attr("text-anchor", "middle")
                .attr("fill", "black")
                .text(d => d))
            .call(g => g.selectAll("text")
                .clone(true).lower()
                .attr("fill", "none")
                .attr("stroke-width", 5)
                .attr("stroke-linejoin", "round")
                .attr("stroke", "white"));

        valueAxesRef.current = newValueAxes;
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

        clearInteractions();

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
        } else {
            // Individual mode: use click interactions
            if (interactionType === INTERACTION_TYPES.EXPLORE) {
                addAxisRegion();
                activateAddFeature();
            } else if (interactionType === INTERACTION_TYPES.CONNECT) {
                activateConnectFeature();
            }
        }

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
            .on("click", null)
            .classed("connect-entity-dot", false)
            .classed("hovered-entity-dot", false);
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

    const addAxisRegion = () => {
        const svg = d3.select("#sankey-svg");

        svg.selectAll(".axis")
            .append("rect")
            .attr("class", "axis-region")
            .attr("x", -10)
            .attr("y", marginTop)
            .attr("width", 20)
            .attr("height", chartHeight - marginTop - marginBottom)
            .attr("fill", "transparent")
            .attr("pointer-events", "all")
    }

    const populateEntities = () => {
        console.log("Populate entities in PCP", entities);

        const svg = d3.select("#sankey-svg");

        // Draw path for the entity
        const line = d3.line()
            // .defined(([, value]) => value != null)
            .x(([key]) => variableAxesRef.current(key))
            .y(([key, value]) => valueAxesRef.current.get(key)(value));

        svg.selectAll(".entity-path").remove();
        svg.selectAll(".entity-dot").remove();

        /**
         * Draw entities
         * 
         * Draw circles for values on each axis
         * Draw path for entities across axes
         * 
         */
        Object.values(entities).forEach(entity => {
            Object.entries(entity).filter(([key, value]) => key !== "id" && value !== null).forEach(([key, value]) => {
                svg.append("circle")
                    .attr("class", "entity-dot")
                    .attr("id", `dot_${entity["id"]}_${key}`)
                    .attr("cx", variableAxesRef.current(key))
                    .attr("cy", valueAxesRef.current.get(key)(value))
                    .attr("r", 4)

            });

            svg.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path")
                .attr("id", `entity_path_${entity["id"]}`)
                .attr("d", d => line(
                    sortableVariables
                        .filter(variable => d[variable.name] !== null)
                        .map(variable => [variable.name, d[variable.name]])
                ))
        });

        svg.selectAll(".entity-dot")
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

                    console.log("entity", connectedEntity1, connectedEntity2);

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
        const svg = d3.select("#sankey-svg");
        const brushWidth = 50;
        const selections = new Map();

        const brush = d3.brushY()
            .extent([
                [-(brushWidth / 2), marginTop],
                [brushWidth / 2, chartHeight - marginBottom]
            ])
            .on("start brush end", (event, key) => {
                // Skip if the event was triggered by a programmatic brush clear
                if (event.sourceEvent === null) return;
                brushed(event, key);
            });

        function brushed(event, key) {
            // Only process brush events in batch mode
            if (!isBatchModeRef.current) return;

            const { selection } = event;

            if (selection === null) {
                selections.delete(key);
                svg.select(`#count-label-${key}`).remove();
                return;
            } else {
                selections.set(key, selection.map(valueAxesRef.current.get(key).invert));
            }

            const newSelectedEntities = [];
            const countsByAxis = new Map();
            Array.from(selections.keys()).forEach(axis => countsByAxis.set(axis, 0));

            svg.selectAll(".entity-path").each(function (d) {
                if (d) {
                    const active = Array.from(selections).every(([key, [max, min]]) => {
                        if (d[key] === null) return false;
                        return d[key] >= min && d[key] <= max;
                    });

                    const isComplete = sortableVariables.every(variable => d[variable.name] !== null);

                    let shouldSelect = false;
                    if (activeInteractionRef.current === INTERACTION_TYPES.CONNECT) {
                        const hasPointInSelection = Array.from(selections).some(([key, [max, min]]) =>
                            d[key] !== null && d[key] >= min && d[key] <= max
                        );
                        shouldSelect = hasPointInSelection && !isComplete;
                    } else if (activeInteractionRef.current === INTERACTION_TYPES.EXPLORE) {
                        shouldSelect = active && isComplete;
                    }

                    if (shouldSelect) {
                        d3.select(this).classed("brush-selection", true);
                        d3.select(this).classed("brush-non-selection", false);
                        d3.select(this).raise();
                        newSelectedEntities.push(d);

                        // Highlight associated dots
                        Object.entries(d).forEach(([key, value]) => {
                            if (key !== "id" && value !== null) {
                                d3.select(`#dot_${d["id"]}_${key}`)
                                    .classed("selected-entity-dot", true)
                                    .classed("unselected-entity-dot", false)
                                    .raise();
                            }
                        });

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
                        d3.select(this).classed("brush-selection", false);
                        d3.select(this).classed("brush-non-selection", true);

                        // De-highlight associated dots
                        Object.entries(d).forEach(([key, value]) => {
                            if (key !== "id" && value !== null) {
                                d3.select(`#dot_${d["id"]}_${key}`)
                                    .classed("selected-entity-dot", false)
                                    .classed("unselected-entity-dot", true);
                            }
                        });
                    }
                }
            });

            // Update both ref and state
            console.log("activeInteraction", activeInteractionRef.current);
            console.log("selections", selections);
            console.log("newSelectedEntities", newSelectedEntities);
            selectedEntitiesRef.current = newSelectedEntities;
            setSelectedEntities(newSelectedEntities);

            // Synchronize immediately with the new selection
            synchronizeSankeySelection(newSelectedEntities);

            // Update count labels for each axis
            countsByAxis.forEach((count, axis) => {
                // Remove existing label
                svg.select(`#count-label-${axis}`).remove();

                // Add new label if there's a selection
                if (selections.has(axis)) {
                    const axisX = variableAxesRef.current(axis);
                    const axisY = valueAxesRef.current.get(axis);
                    const [selectionY1, selectionY2] = selections.get(axis);
                    const labelY = (selectionY1 + selectionY2) / 2; // Middle of brush selection

                    svg.append("text")
                        .attr("id", `count-label-${axis}`)
                        .attr("x", axisX + 15) // Offset from axis
                        .attr("y", axisY(labelY))
                        .attr("dy", ".35em") // Vertical alignment
                        .attr("class", "selection-count")
                        .text(`n = ${count}`);
                }
            });

            svg.selectAll(".entity-dot").raise();
            svg.selectAll(".selection-count").raise();
            setBrushSelectedRegions(selections);
        }

        svg.selectAll(".axis")
            .call(brush)
            .call(brush.move, null);
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

    const generateConditionalEntities = () => {
        // Find axis with selected points
        const axisWithPoints = Array.from(brushSelectedRegions.keys()).find(axis => {
            const [max, min] = brushSelectedRegions.get(axis);
            return selectedEntities.some(entity =>
                entity[axis] !== null &&
                entity[axis] >= min &&
                entity[axis] <= max
            );
        });

        if (!axisWithPoints) return;

        // Get selected points on the axis
        const [max, min] = brushSelectedRegions.get(axisWithPoints);
        const selectedPoints = selectedEntities.filter(entity =>
            entity[axisWithPoints] !== null &&
            entity[axisWithPoints] >= min &&
            entity[axisWithPoints] <= max
        );

        // Generate connected entities for each selected point
        const newEntities = [];
        selectedPoints.forEach(point => {
            const newEntity = { [axisWithPoints]: point[axisWithPoints] };

            // Generate random values for other selected regions
            Array.from(brushSelectedRegions.keys()).forEach(axis => {
                if (axis !== axisWithPoints) {
                    const [max, min] = brushSelectedRegions.get(axis);
                    newEntity[axis] = Math.random() * (max - min) + min;
                }
            });

            newEntities.push(newEntity);
        });

        addEntities(newEntities);
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
            console.log("New entity data: ", entityData);
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


    function toggleAxesFilter(event) {
        const axisName = event.target.value;
        setAxesFilterStatus(prevStatus => ({
            ...prevStatus,
            [axisName]: !prevStatus[axisName]
        }));
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    return (
        <Box>
            <Box sx={{ my: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <FormControl
                        component="fieldset"
                        sx={{
                            border: '1px solid',
                            borderColor: 'grey.500',
                            borderRadius: 1,
                            p: 2
                        }}
                    >
                        <FormLabel component="legend">Interaction Mode</FormLabel>
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
                                label="Explore Complete Patterns"
                            />
                            <FormControlLabel
                                value={INTERACTION_TYPES.CONNECT}
                                control={<Radio />}
                                label="Connect Incomplete Patterns"
                            />
                        </RadioGroup>
                    </FormControl>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={isBatchMode}
                                onChange={(e) => changeBatchMode(e.target.checked)}
                            />
                        }
                        label="Batch Mode"
                        sx={{ ml: 2 }}
                    />

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
                                <Button
                                    disabled={
                                        (isBatchMode && (selectedEntities.length === 0 || activeInteraction !== INTERACTION_TYPES.CONNECT || brushSelectedRegions.size < 2)) ||
                                        (!isBatchMode)
                                    }
                                    variant='outlined'
                                    onClick={connectRandomEntities}>
                                    Link
                                </Button>
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
            </Box>

            <Box sx={{ width: "100%", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext
                        items={sortableVariables}
                        strategy={verticalListSortingStrategy}
                    >
                        <Box sx={{ width: '100%', minHeight: '40px', display: 'flex', flexDirection: 'row', position: 'relative' }}>
                            {sortableVariables.map(item => {
                                const axisPosition = variableAxesRef.current(item.name) - labelOffset;

                                return (
                                    <SortableItem
                                        key={item.name}
                                        id={item.name}
                                        axesFilterStatus={axesFilterStatus}
                                        toggleAxesFilter={toggleAxesFilter}
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

                <Box sx={{ width: "100%", mx: 'auto', mt: 1 }} id='sankey-div'></Box>
            </Box>

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
        </Box >
    )
}

export const SortableItem = forwardRef(({ id, axesFilterStatus, toggleAxesFilter, axisPosition, activeInteraction }, ref) => {
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
            axesFilterStatus={axesFilterStatus}
            toggleAxesFilter={toggleAxesFilter}
            axisPosition={axisPosition}
            activeInteraction={activeInteraction}
            style={style}
            {...attributes}
            {...listeners}
        />
    );
});

export const Item = forwardRef(({ id, axesFilterStatus, toggleAxesFilter, axisPosition, activeInteraction, ...props }, ref) => {

    return (
        <Box {...props}
            ref={ref}
            sx={{
                display: 'block flex', flexDirection: 'column', alignItems: 'center',
                left: axisPosition, position: 'absolute'
            }}
        >
            <DragHandleIcon />
            <Typography>{id}</Typography>
            {/* <Radio
                size='small'
                sx={{ padding: "2px" }}
                disabled={activeInteraction !== INTERACTION_TYPES.PARTIALLY}
                checked={axesFilterStatus ? axesFilterStatus[id] : false}
                value={id}
                onClick={(event) => toggleAxesFilter(event)}
            /> */}
        </Box>
    )
});