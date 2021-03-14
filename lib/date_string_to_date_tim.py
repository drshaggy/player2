import datetime

def date_conversion(date_string):
    split_string = date_string.split('-')
    date = datetime.date(int(split_string[0]), int(split_string[1]), int(split_string[2]))
    return date

d = "2021-03-13"
date = date_conversion(d)  
print(date.month)  

