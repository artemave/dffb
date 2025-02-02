FROM python:3.12

WORKDIR /app

# Install pipenv
RUN pip install pipenv

# Copy Pipenv files first to leverage Docker cache
COPY Pipfile Pipfile.lock /app/

# Install dependencies
RUN pipenv install

# Copy the rest of the application
COPY . /app

# Define the command to run the worker script
CMD ["pipenv", "run", "python", "bot.py"]
