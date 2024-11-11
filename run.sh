#!/bin/bash
uvicorn main:app --reload & # Start backend server
npm start  # Start frontend server