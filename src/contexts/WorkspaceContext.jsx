import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const WorkspaceContext = createContext();


export const TASK_SETTINGS = {
    // "growth":{
    //     id: "growth",
    //     name: "Human Growth Prediction",
    //     scenario: "During the early stages of life the stature of female and male are about the same,\
    //             but their stature start to clearly to differ during growth and in the later stages of life.\
    //             In the early stage man and female are born roughly with the same stature, around 45cm - 55cm.\
    //             By the time they are born reaching around 2.5 years old, both male and female present the highest growth rate (centimetres pey year).\
    //             It is the time they grow the fastest. During this period, man has higher growth rate compared to female.\
    //             For both male and female there is a spurt growth in the pre-adulthood.\
    //             For man, this phase shows fast growth rate varying in between 13-17 years old and female varying from 11-15.\
    //             Also, male tend to keep growing with roughly constant rate until the age of 17-18, while female with until the age of 15-16.\
    //             After this period of life they tend to stablish their statures mostly around 162 - 190cm and 155 - 178cm respectively.",
    //     defaultModel: `model <- glm(height ~ age, family = binomial(link = "logit"))`,
    // },
    "income": {
        id: "income",
        name: "Income Prediction",
        scenario: "You are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how people's age and their years of education impact their annualy income in the U.S.",
        defaultModel: `model <- glm(income ~ age + education, family = binomial(link = "logit"))`
    },
    "loan": {
        id: "loan",
        name: "Loan Approval Prediction",
        scenario: "You are a loan officer at a bank.\
            You want to assess the likelihood of a loan will be approved based on the applicant's annual income, credit score, the amount of loan requested, and the term of the loan.",
        defaultModel: `model <- glm(loan_approved ~ income + credit_score + loan_amount + loan_term, family = binomial(link = "logit"))`
    },
    "insurance": {
        id: "insurance",
        name: "Insurance Cost Prediction",
        scenario: "You are an insurance analyst at a insurance company.\
         You want to assess the cost of insurance based on the applicants' ages and their BMI scores.",
        defaultModel: `model <- glm(insurance_cost ~ age + bmi, family = gaussian(link = "identity"))`
    },
    "pressure": {
        id: "pressure",
        name: "Student Pressure Prediction",
        scenario: "You are a data analyst at a university.\
            You want to assess the academic pressure of students based on the number of hours they sleep per night, the number of hours they study per week, and their satisfaction of their study progress.",
        defaultModel: `model <- glm(pressure ~ sleep_hours + hours_studied + satisfaction, family = gaussian(link = "identity"))`
    }
}

export const ELICITATION_SPACE = {
    PARAMETER: "Parameter Space",
    OBSERVABLE: "Observable Space"
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

    // Fetch study settings on component mount
    useEffect(() => {
        axios.get(window.BACKEND_ADDRESS + '/study-settings')
            .then(response => {
                console.log("fetch study settings", response.data);
                setTaskId(response.data.task_id);
                setSpace(response.data.elicitation_space);
                setFeedback(response.data.feedback_mode);
            })
            .catch(error => console.error('Error fetching study settings:', error));
    }, []);

    // Set model when task changes
    useEffect(() => {
        if (taskId) {
            setModel(TASK_SETTINGS[taskId].defaultModel);
        }
    }, [taskId]);

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
        setFeedback
    };

    return (
        <WorkspaceContext.Provider value={contextValue}>
            {children}
        </WorkspaceContext.Provider>
    );
}; 