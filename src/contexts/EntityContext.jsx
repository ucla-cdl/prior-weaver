import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkspaceContext } from './WorkspaceContext';
import { VariableContext } from './VariableContext';

export const EntityContext = createContext();

export const EntityProvider = ({ children }) => {
    const { taskId, space, feedback, model, savedEnvironment, studyActive } = useContext(WorkspaceContext);
    const { variablesDict, parametersDict, translationTimes, predictiveCheckResults } = useContext(VariableContext);

    const [entities, setEntities] = useState({});
    const [entityHistory, setEntityHistory] = useState([{
        timestamp: new Date().toISOString(),
        operation: 'initial',
        entitiesAffected: [],
        data: null,
        description: "Initial state",
        previousState: {}
    }]);
    const [currentVersion, setCurrentVersion] = useState(0);

    // Load entities from saved environment if available
    useEffect(() => {
        if (savedEnvironment) {
            setEntities(savedEnvironment.entities);
            setEntityHistory(savedEnvironment.entityHistory);
            setCurrentVersion(savedEnvironment.entityHistory.length - 1);

            console.log("Loaded entities from saved environment.");
        }
    }, [savedEnvironment]);

    // Record the operation of the entity
    const recordEntityOperation = (operation, entitiesAffected, data, description, newEntities) => {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            operation: operation,
            entitiesAffected: entitiesAffected,
            data: data,
            description: description,
            previousState: newEntities // Use the new entities state
        };

        // Remove any future history entries if we're not at the latest version
        const newHistory = [...entityHistory].slice(0, currentVersion + 1);

        setEntityHistory([...newHistory, historyEntry]);
        setCurrentVersion((prev) => prev + 1);
        console.log("recordEntityOperation", historyEntry);
    };

    // Undo the last operation
    const undoEntityOperation = () => {
        if (currentVersion > 0) {
            const previousVersion = entityHistory[currentVersion - 1];
            setEntities(previousVersion.previousState);
            setCurrentVersion(currentVersion - 1);
        }
    };

    // Redo the last operation
    const redoEntityOperation = () => {
        if (currentVersion < entityHistory.length - 1) {
            const nextVersion = entityHistory[currentVersion + 1];
            // Apply the operation based on the history entry
            setEntities(nextVersion.previousState);
            setCurrentVersion(currentVersion + 1);
        }
    };

    // Update the entity operations to pass the new entities state
    const addEntities = (entitiesData, description = "") => {
        console.log("add entities", entitiesData);
        setEntities((prev) => {
            let newEntities = { ...prev };
            const newEntityIds = [];

            entitiesData.forEach((entityData) => {
                const newEntity = {
                    id: uuidv4()
                };
                newEntityIds.push(newEntity.id);

                Object.keys(variablesDict).forEach((key) => {
                    newEntity[key] = null;
                });
                Object.entries(entityData).forEach(([key, value]) => {
                    newEntity[key] = value;
                });

                newEntities[newEntity.id] = newEntity;
            });

            // Record the operation with the new entities state
            recordEntityOperation('add', newEntityIds, entitiesData, description, newEntities);

            return newEntities;
        });
    }

    // Delete the entities
    const deleteEntities = (entitiesIDs, description = "") => {
        console.log("delete entities", entitiesIDs);
        let newEntities = { ...entities };
        entitiesIDs.forEach((entityID) => {
            delete newEntities[entityID];
        });

        recordEntityOperation('delete', entitiesIDs, null, description, newEntities);
        setEntities(newEntities);
    }

    // Update the entities
    const updateEntities = (entitiesIDs, entitiesData, description = "") => {
        console.log("update entities", entitiesIDs, entitiesData);
        let newEntities = { ...entities };
        entitiesIDs.forEach((entityID, i) => {
            let entityData = entitiesData[i];
            // If all values in entityData are null, delete the entity
            if (Object.values(entityData).every(value => value === null)) {
                delete newEntities[entityID];
            } else {
                let newEntity = { ...newEntities[entityID] };
                Object.entries(entityData).forEach(([key, value]) => {
                    newEntity[key] = value;
                });
                newEntities[entityID] = newEntity;
            }
        });

        recordEntityOperation('update', entitiesIDs, entitiesData, description, newEntities);
        setEntities(newEntities);
    }

    // Combine the entities
    const combineEntities = (entitiesToDelete, entitiesData, description = "") => {
        // Delete the original entities
        let newEntities = { ...entities };
        entitiesToDelete.forEach(entityId => {
            delete newEntities[entityId];
        });

        // Add the new combined entities
        const newEntityIds = [];
        entitiesData.forEach(entityData => {
            const newEntityId = uuidv4();
            newEntities[newEntityId] = {
                ...entityData,
                id: newEntityId
            };
            newEntityIds.push(newEntityId);
        });

        recordEntityOperation('combine', entitiesToDelete, entitiesData, description, newEntities);
        setEntities(newEntities);
    }

    // Get how many entities are on each axes
    const getEntitiesCntDifference = (varName) => {
        // Count entities for each variable
        const variableEntityCounts = {};
        Object.keys(variablesDict).forEach(key => {
            variableEntityCounts[key] = Object.values(entities).filter(entity => entity[key] !== null).length;
        });

        // Find variable with most entities
        const maxCount = Math.max(...Object.values(variableEntityCounts));

        // Return difference between current variable and max
        return [variableEntityCounts[varName], maxCount - variableEntityCounts[varName]];
    }

    // Get the description of the last operation
    const getUndoOperationDescription = () => {
        if (currentVersion <= 0) return "No operation to undo";

        const currentOperation = entityHistory[currentVersion];
        const operation = currentOperation.operation;
        if (operation === 'initial') return "Cannot undo initial state";

        const count = currentOperation.entitiesAffected.length;

        switch (operation) {
            case 'add':
                return `${currentVersion}: Undo adding ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'update':
                return `${currentVersion}: Undo updating ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'delete':
                return `${currentVersion}: Undo deleting ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'combine':
                return `${currentVersion}: Undo combining ${count} ${count === 1 ? 'entity' : 'entities'}`;
            default:
                return "Unknown operation";
        }
    };

    const getRedoOperationDescription = () => {
        if (currentVersion >= entityHistory.length - 1) return "No operation to redo";
        const nextOperation = entityHistory[currentVersion + 1];
        const operation = nextOperation.operation;
        if (operation === 'initial') return "Cannot redo initial state";

        const count = nextOperation.entitiesAffected.length;

        switch (operation) {
            case 'add':
                return `${currentVersion}: Redo adding ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'update':
                return `${currentVersion}: Redo updating ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'delete':
                return `${currentVersion}: Redo deleting ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'combine':
                return `${currentVersion}: Redo combining ${count} ${count === 1 ? 'entity' : 'entities'}`;
            default:
                return "Unknown operation";
        }
    }

    const finishSpecification = () => {
        const data = {
            finishTimeStamp: new Date().toISOString(),
            taskId: taskId,
            space: space,
            feedback: feedback,
            model: model,
            variablesDict: variablesDict,
            parametersDict: parametersDict,
            entities: entities,
            entityHistory: entityHistory,
            translationTimes: translationTimes,
            predictiveCheckResults: predictiveCheckResults,
        };

        // Create blob and download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'elicitation-results.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        if (studyActive) {
            window.open(window.POST_TASK_SURVEY_URL);
        }
    }

    const contextValue = {
        entities,
        setEntities,
        entityHistory,
        currentVersion,
        addEntities,
        deleteEntities,
        updateEntities,
        combineEntities,
        undoEntityOperation,
        redoEntityOperation,
        getEntitiesCntDifference,
        getUndoOperationDescription,
        getRedoOperationDescription,
        finishSpecification
    };

    return (
        <EntityContext.Provider value={contextValue}>
            {children}
        </EntityContext.Provider>
    );
}; 