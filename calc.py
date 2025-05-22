from datetime import datetime, timedelta

# Birth date of Prophet Muhammad ﷺ
birth_date = datetime(570, 4, 20)

# 1500 solar years = 1500 * 365.25 days
solar_days = 1500 * 365.25

# Add the solar days to the birth date
solar_anniversary_date = birth_date + timedelta(days=solar_days)

# Print the result
print("1500 solar years since the Prophet's birth will be on:", solar_anniversary_date.strftime("%A, %d %B %Y"))
