from fastapi import FastAPI, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from concurrent.futures.process import ProcessPoolExecutor
from pydantic import BaseModel
from typing import List, Dict

import numpy as np
import scipy.stats as stats
from fitter import Fitter

import pandas as pd
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    print("Backend is ready")


@app.on_event("shutdown")
def shutdown_db_client():
    print("Backend is shut down")


@app.get('/')
def root():
    print("checking root")
    return {"message": "Hello World!"}


class BiVariableData(BaseModel):
    populateDots: List[dict]
    chipDots: List[dict]


@app.post('/fitBiVarRelation')
def fit_bi_var_relation(data: BiVariableData = Body(...)):
    dots = data.populateDots + data.chipDots
    df = pd.DataFrame(dots)

    X = df[['x']]
    y = df['y']

    # Polynomial Regression
    degree = 2  # Set degree for non-linearity
    poly = PolynomialFeatures(degree=degree)
    X_poly = poly.fit_transform(X)

    model = LinearRegression()
    model.fit(X_poly, y)

    # Predict values for the given range of x (for smooth plotting)
    x_range = pd.DataFrame(
        {'x': range(int(min(df['x'])), int(max(df['x'])) + 1)})
    X_poly_range = poly.fit_transform(x_range)
    predictions = model.predict(X_poly_range)

    # Prepare the response
    response_data = {
        'fittedLine': [{'x': x_val, 'y': y_pred} for x_val, y_pred in zip(x_range['x'], predictions)],
        'equation': f'y = {model.coef_[1]:.2f} * x^1 + {model.coef_[2]:.2f} * x^2 + {model.intercept_:.2f}'
    }

    print("bivariate relation fitted", response_data['equation'])
    return response_data


class TranslationData(BaseModel):
    entities: List[dict]
    variables: List[dict]


@app.post('/translate')
def translate(data: TranslationData = Body(...)):
    print("translation started")
    entities = data.entities
    variables = data.variables

    # Dynamically determine predictors and response variable
    variable_names = [var["name"] for var in variables]
    # Treat the last variable as the response
    response_var = variable_names[-1]
    predictors = variable_names[:-1]  # Remaining variables are predictors

    # Convert dataset to NumPy arrays
    dataset = np.array([
        [entity[var_name] for var_name in variable_names]
        for entity in entities
    ])
    X = dataset[:, :-1]  # Predictor variables
    y = dataset[:, -1]   # Response variable

    # Sampling and fitting
    num_samples = 100
    n_records = len(entities)
    parameter_samples = {var: [] for var in predictors}  # Store coefficients
    intercept_samples = []

    for _ in range(num_samples):
        # Bootstrap sampling
        indices = np.random.choice(n_records, n_records, replace=True)
        X_sample = X[indices]
        y_sample = y[indices]

        # Fit linear model
        model = LinearRegression()
        model.fit(X_sample, y_sample)

        # Store parameter estimates
        for i, var in enumerate(predictors):
            parameter_samples[var].append(model.coef_[i])
        intercept_samples.append(model.intercept_)

    # Prepare the response
    parameter_samples["intercept"] = intercept_samples
    print("translation done")

    # Convert samples to distributions
    fitted_distributions = convert_samples_to_distribution(parameter_samples)
    print("distribution converted")

    return {
        "parameter_distributions": parameter_samples,
        "fitted_distributions": fitted_distributions
    }


def convert_samples_to_distribution(parameter_samples):
    fit_dists = {}
    for param, samples in parameter_samples.items():
        f = Fitter(samples, distributions=[
            'norm', 'expon', 'lognorm', 'gamma', 'beta', 'uniform'])
        f.fit()

        # Generate x values for plotting the PDF of the fitted distributions
        x = np.linspace(min(samples), max(samples), 1000)

        sum = f.summary(plot=False)

        dist_cnt = 0
        idx = 0
        while dist_cnt < 3:
            fit_name = sum.iloc[idx].name
            fit_params = f.fitted_param[fit_name]
            fit_distribution = getattr(stats, fit_name)
            param_names = (fit_distribution.shapes + ", loc, scale").split(
                ", ") if fit_distribution.shapes else ["loc", "scale"]

            fit_params_dict = {}
            for d_key, d_val in zip(param_names, fit_params):
                if not np.isnan(d_val) and not np.isinf(d_val):
                    fit_params_dict[d_key] = float(f"{d_val:.4f}")
                else:
                    print("invalid param: ", d_key, " = ", d_val)

            p = get_fit_var_pdf(x, fit_name, fit_params_dict)

            metrics = {}
            sum_row = sum.loc[fit_name]
            for col_label in sum.columns:
                if not np.isnan(sum_row[col_label]) and not np.isinf(sum_row[col_label]):
                    metrics[col_label] = float(f"{sum_row[col_label]:.4f}")

            if np.isnan(p).any() or np.isinf(p).any() or np.isnan(x).any() or np.isinf(x).any():
                print("invalid distribution: ", fit_name)
                idx += 1
                continue

            fit_dists[param] = {
                'name': fit_name,
                'params': fit_params_dict,
                'x': x.tolist(),
                'p': p.tolist(),
                'metrics': metrics
            }

            dist_cnt += 1
            idx += 1
            print("distribution fitted: ", fit_name)

    return fit_dists


def get_fit_var_pdf(x, fit_name, fit_params):
    # Get the distribution function from scipy.stats based on fit_name
    dist = getattr(stats, fit_name)

    # Pass the keyword arguments dynamically based on the provided fit_params
    p = dist.pdf(x, **fit_params)

    return p