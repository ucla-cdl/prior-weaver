import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import { WorkspaceContext } from './WorkspaceContext';
import axios from 'axios';

export const VariableContext = createContext();

const DEFAULT_VARIABLE_ATTRIBUTES = {
    min: 0,
    max: 100,
    unitLabel: "",
};

const RELATIONS = {
    INFLUENCE: "influences",
    ASSOCIATE: "associates with",
    NONE: "not related to",
};

export const VariableProvider = ({ children }) => {
    const { model, setModel, finishParseModel, setFinishParseModel } = useContext(WorkspaceContext);
    const [variablesDict, setVariablesDict] = useState({});
    const [sortableVariables, setSortableVariables] = useState([]);
    const [parametersDict, setParametersDict] = useState({});
    const [biVariable1, setBiVariable1] = useState(null);
    const [biVariable2, setBiVariable2] = useState(null);

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
    }, [variablesDict]);
    
    useEffect(() => {
        if (finishParseModel) {
            setBiVariable1(Object.values(variablesDict)[1]);
            setBiVariable2(Object.values(variablesDict)[0]);
        }
    }, [finishParseModel]);

    // Add a new variable
    const addVariable = (data) => {
        updateVariable(data.name, data);

        const paramName = `p_${data.name}`;
        setParametersDict((prev) => ({
            ...prev,
            [paramName]: {
                name: paramName,
                relatedVar: data.name,
            }
        }));
    };

    // Update the variable
    const updateVariable = (name, updates) => {
        let finalUpdates = { ...updates };

        // If min or max is updated, recalculate bin edges
        if ('min' in updates || 'max' in updates) {
            const currentVar = variablesDict[name] || {};
            const newMin = updates.min ?? currentVar.min;
            const newMax = updates.max ?? currentVar.max;

            // Create 10 equally spaced bins
            const binCount = 10;
            const step = (newMax - newMin) / binCount;
            const binEdges = Array.from({ length: binCount + 1 }, (_, i) => newMin + step * i);

            finalUpdates.binEdges = binEdges;
        }

        console.log("update variable", name, finalUpdates);
        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    const handleParseModel = () => {
        axios.post(window.BACKEND_ADDRESS + '/getStanCodeInfo', {
            code: model
        })
            .then((response) => {
                console.log(response.data);
                const codeInfo = response.data.code_info;
                /**
                 * Parse GLM code
                 * 
                 * Format:
                 * {
                 *  'code': 'model <- glm(outcome ~ age + gender, family = binomial(link = "logit"))',
                 *  'formula': 'outcome ~ age + gender', 
                 *  'response': 'outcome', 
                 *  'predictors': ['age', 'gender'], 
                 *  'family': 'binomial', 
                 *  'link': 'logit'
                 * }
                 */
                Object.entries(codeInfo).forEach(([section, sectionInfo]) => {
                    switch (section) {
                        case "response":
                            updateVariable(sectionInfo, {
                                name: sectionInfo,
                                type: "response",
                                min: DEFAULT_VARIABLE_ATTRIBUTES.min,
                                max: DEFAULT_VARIABLE_ATTRIBUTES.max,
                                unitLabel: DEFAULT_VARIABLE_ATTRIBUTES.unitLabel,
                                sequenceNum: 0
                            });
                            break;
                        case "predictors":
                            sectionInfo.forEach((predictor, index) => {
                                addVariable({
                                    name: predictor,
                                    type: "predictor",
                                    min: DEFAULT_VARIABLE_ATTRIBUTES.min,
                                    max: DEFAULT_VARIABLE_ATTRIBUTES.max,
                                    unitLabel: DEFAULT_VARIABLE_ATTRIBUTES.unitLabel,
                                    sequenceNum: index + 1
                                });
                            });
                            break;
                        case "code":
                            setModel(sectionInfo);
                            break;
                        default:
                            break;
                    }
                });

                // Add Extra parameters
                setParametersDict((prev) => ({ ...prev, 'intercept': { name: 'intercept', relatedVar: 'intercept' } }));
            })
            .finally(() => {
                setFinishParseModel(true);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    // Add variable to the bi-variable plot
    const addToBiVarPlot = (variable) => {
        if (biVariable1 === null) {
            setBiVariable1(variable);
        }
        else if (biVariable2 === null) {
            setBiVariable2(variable);
        }
    }

    const contextValue = {
        variablesDict,
        setVariablesDict,
        parametersDict,
        setParametersDict,
        biVariable1,
        setBiVariable1,
        biVariable2,
        setBiVariable2,
        addVariable,
        updateVariable,
        handleParseModel,
        DEFAULT_VARIABLE_ATTRIBUTES,
        RELATIONS,
        addToBiVarPlot,
        sortableVariables,
        setSortableVariables,
    };

    return (
        <VariableContext.Provider value={contextValue}>
            {children}
        </VariableContext.Provider>
    );
}; 