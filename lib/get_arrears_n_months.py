arr = [1,0,0,0,0,0,1,0,0,0,0,1,1,0,1]
no_months = 3
print(arr)

def get_arrears_n_months(no_months, array_1d):
    newArray = []
    for count, value in enumerate(array_1d):
        trigger = 0
        for i in range(no_months):
            if count - i >= 0:
                trigger += array_1d[count - i]
            else:
                pass
        if trigger == 0:
            newArray.append(0)
        else:
            newArray.append(1)
    return newArray

print(get_arrears_n_months(3, arr))