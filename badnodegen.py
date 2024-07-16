#nodes=input("")
#nodes=nodes.split(" ")
#print(nodes)
nodes = []
while 1:
    i=input("")
    if i!="q":
        nodes.append(i)
    else:
        break

longest = 0
for node in nodes:
    length = len(node)
    if length > longest:
        longest = length

for node in nodes:
    print('{"x": 0, "y": 0, "name": '+' '*(longest-len(node))+'"'+node+'"},')
