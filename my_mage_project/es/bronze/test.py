def print_n_times(thing, n):
    # Base case: stop when n reaches 0
    if n <= 0:
        return
    
    print(thing)
    # Recursive step: call again with n - 1
    print_n_times(thing, n - 1)

# Call the function
print_n_times("Hello", 5)
