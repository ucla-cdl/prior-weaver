from fastapi import FastAPI, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from concurrent.futures.process import ProcessPoolExecutor
from pydantic import BaseModel
from typing import List, Dict

import numpy as np
import preliz as pz
import fitter
import scipy.stats as stats

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
    return {"message": "Hello World!"}


class VariableData(BaseModel):
    bin_edges: List[float]
    counts: List[int]


@app.post('/fitVarDist')
def fit_var_dist(data: VariableData = Body(...)):
    # Calculate the bin centers
    bin_edges = np.array(data.bin_edges)
    bin_counts = np.array(data.counts)
    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

    # Reconstruct the data from bin centers and counts
    data = np.repeat(bin_centers, bin_counts)

    # Fit distributions to the reconstructed data
    f = fitter.Fitter(data, distributions=[
                      'norm', 'expon', 'lognorm', 'gamma', 'beta', 'uniform'])
    f.fit()

    # Generate x values for plotting the PDF of the fitted distributions
    x = np.linspace(min(bin_edges), max(bin_edges), 1000)

    fit_dists = []
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

        fit_dists.append({
            'name': fit_name,
            'params': fit_params_dict,
            'x': x.tolist(),
            'p': p.tolist(),
            'metrics': metrics
        })

        dist_cnt += 1
        idx += 1

    return fit_dists


def get_fit_var_pdf(x, fit_name, fit_params):
    # Get the distribution function from scipy.stats based on fit_name
    dist = getattr(stats, fit_name)

    # Pass the keyword arguments dynamically based on the provided fit_params
    p = dist.pdf(x, **fit_params)

    return p


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
    x_range = pd.DataFrame({'x': range(int(min(df['x'])), int(max(df['x'])) + 1)})
    X_poly_range = poly.fit_transform(x_range)
    predictions = model.predict(X_poly_range)

    # Prepare the response
    response_data = {
        'fittedLine': [{'x': x_val, 'y': y_pred} for x_val, y_pred in zip(x_range['x'], predictions)],
        'equation': f'y = {model.coef_[1]:.2f} * x^1 + {model.coef_[2]:.2f} * x^2 + {model.intercept_:.2f}'
    }

    print("bivariate relation fitted", response_data['equation'])
    return response_data