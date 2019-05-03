import docker

client = docker.from_env()
client.networks.create("network1", driver="bridge")
client.containers.run('mongo:latest',network="network1",name="mongo",detach = True)

client.containers.run('acts:latest',ports={'8000/tcp': 8000},network="network1",name="acts_8000",detach = True )
'''
client.containers.run('acts',ports={'80/tcp': 8001},network="network1",name="8001_acts",detach = True)
client.containers.run('acts',ports={'80/tcp': 8002},network="network1",name="8002_acts",detach = True)
'''