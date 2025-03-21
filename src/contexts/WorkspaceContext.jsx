import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const WorkspaceContext = createContext();

export const TASK_SETTINGS = {
    "house": {
        id: "house",
        name: "House Price Prediction",
        scenario: "You are a data scientist interested in understanding the factors that influence house prices.\
                Specifically, you want to assess how house's distance to the nearest metro station, its age, and the number of stores in the area impact its selling price.",
        defaultModel: `model <- glm(house_price ~ distance_to_metro + house_age + num_stores, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "distance_to_metro",
                    "unit": "km",
                    "description": "The distance to the nearest metro station."
                },
                {
                    "name": "house_age",
                    "unit": "yrs",
                    "description": "The age of the house."
                },
                {
                    "name": "num_stores",
                    "unit": "stores",
                    "description": "The number of stores in the neighborhood."
                }
            ],
            "response": [
                {
                    "name": "house_unit_price",
                    "unit": "$k/m^2",
                    "description": "The selling price of the house per square meter."
                }
            ]
        }
    },
    "income": {
        id: "income",
        name: "Income Prediction",
        scenario: "You are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how people's age and their years of education impact their annualy income in the U.S.",
        defaultModel: `model <- glm(income ~ age + education, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "age",
                    "unit": "yrs",
                    "description": "The age of the person."
                },
                {
                    "name": "education",
                    "unit": "yrs",
                    "description": "The years of education of the person."
                }
            ],
            "response": [
                {
                    "name": "income",
                    "unit": "$k",
                    "description": "The annual income of the person."
                }
            ]
        }
    },
    "score": {
        id: "score",
        name: "Student Exam Score Prediction",
        scenario: "You are a data scientist interested in understanding the factors that influence students' performance.\
                Specifically, you want to assess how students' hours of study and attendence rate impact their exam score.",
        defaultModel: `model <- glm(exam_score ~ hours_study + attendence_rate, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "hours_study",
                    "unit": "hrs",
                    "description": "The hours of study of the student."
                },
                {
                    "name": "attendence_rate",
                    "unit": "%",
                    "description": "The attendence rate of the student."
                }
            ],
            "response": [
                {
                    "name": "exam_score",
                    "unit": "pts",
                    "description": "The exam score of the student."
                }
            ]
        }
    },
    "car": {
        id: "car",
        name: "Car Price Prediction",
        scenario: "You are a data scientist interested in understanding the factors that influence car prices.\
                Specifically, you want to assess how car's present price and mileage impact its selling price.",
        defaultModel: `model <- glm(selling_price ~ mileage + present_price, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "mileage",
                    "unit": "miles",
                    "description": "The mileage of the car."
                },
                {
                    "name": "present_price",
                    "unit": "$k",
                    "description": "The present price of the car."
                }
            ],
            "response": [
                {
                    "name": "selling_price",
                    "unit": "$k", "description": "The selling price of the car."
                }
            ]
        }
    }
}

export const ELICITATION_SPACE = {
    OBSERVABLE: "Observable Space",
    PARAMETER: "Parameter Space"
}

export const FEEDBACK_MODE = {
    FEEDBACK: "With Feedback",
    NO_FEEDBACK: "Without Feedback"
}

export const WorkspaceProvider = ({ children }) => {
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    const [taskId, setTaskId] = useState(null);
    const [model, setModel] = useState('');
    const [space, setSpace] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [finishParseModel, setFinishParseModel] = useState(false);

    const [tutorial, setTutorial] = useState(false);
    const [savedEnvironment, setSavedEnvironment] = useState(null);

    useEffect(() => {
        axios.get(window.BACKEND_ADDRESS + '/study-settings')
            .then(response => {
                console.log("fetching study settings", response.data);
                if (response.data.tutorial) {
                    fetch('/tutorial_data.json', {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    })
                        .then((res) => {
                            console.log("fetching tutorial data", res);
                            return res.json()
                        })
                        .then((data) => {
                            console.log("Loaded saved environment:", data);
                            setTutorial(true);
                            setSavedEnvironment(data);
                        })
                        .catch(error => {
                            console.log("No saved environment found or error loading it:", error);
                        });
                } else {
                    setTutorial(false);
                    setTaskId(response.data.task_id);
                    setModel(TASK_SETTINGS[response.data.task_id].defaultModel);
                    setSpace(response.data.elicitation_space);
                    setFeedback(response.data.feedback_mode);
                }
            })
            .catch(error => {
                console.log("Error fetching study settings:", error);
            });
    }, []);

    useEffect(() => {
        if (savedEnvironment) {
            setTaskId(savedEnvironment.taskId);
            setModel(savedEnvironment.model);
            setSpace(savedEnvironment.space);
            setFeedback(savedEnvironment.feedback);
        }
    }, [savedEnvironment]);

    const contextValue = {
        finishParseModel,
        setFinishParseModel,
        leftPanelOpen,
        setLeftPanelOpen,
        rightPanelOpen,
        setRightPanelOpen,
        taskId,
        setTaskId,
        model,
        setModel,
        space,
        setSpace,
        feedback,
        setFeedback,
        savedEnvironment,
        tutorial,
        setTutorial
    };

    return (
        <WorkspaceContext.Provider value={contextValue}>
            {children}
        </WorkspaceContext.Provider>
    );
}; 