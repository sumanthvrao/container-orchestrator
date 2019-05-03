from flask import Flask, request, jsonify
import threading
import requests
import docker
import time
import json
import math

client = docker.from_env()

low_client = docker.APIClient(base_url='unix://var/run/docker.sock')

mongo_cont = client.containers.get("mongo")
temp = client.containers.list()
temp.remove(mongo_cont)
containers_list = temp

current_port = 8000
container_count = len(containers_list)
port_list = [8000]
for cont in containers_list:
	port_dict = low_client.inspect_container(cont.id)['NetworkSettings']['Ports']
	port = int(list(port_dict.values())[0][0]['HostPort'])
	port_list.append(port)

count = 0
started = False

app = Flask(__name__)

def replace_container(cont, port):
	global containers_list
	global port_list
	global container_count
	cont.stop()
	cont.remove()
	print("Removed")
				
	new_cont = client.containers.run(image = "acts:latest", network="network1",name="acts_"+str(port),detach = True, ports = {'8000/tcp':('0.0.0.0',int(port))}) 
	time.sleep(1)
	#new_port_dict = low_client.inspect_container(new_cont.id)['NetworkSettings']['Ports']
	#new_port = int(list(new_port_dict.values())[0][0]['HostPort'])
	port_list.append(port)
	containers_list.append(new_cont)
	container_count += 1
	print("Replaced")

def create_container(port):
	global containers_list
	global container_count
	new_cont = client.containers.run(image = "acts:latest", network="network1",name="acts_"+str(port),detach = True, ports = {'8000/tcp':('0.0.0.0',int(port))}) 
	time.sleep(1)
	#new_port_dict = low_client.inspect_container(new_cont.id)['NetworkSettings']['Ports']
	#new_port = int(list(new_port_dict.values())[0][0]['HostPort'])
	port_list.append(port)
	containers_list.append(new_cont)
	container_count += 1
	print("Created")

def delete_container(del_cont):
	del_cont.stop()
	del_cont.remove()
	print("Removed")


def api():
	@app.route('/api/v1/<path:path>', methods = ["GET", "POST", "DELETE"])
	def handle_routes(path):
		print("Listening...")
		global current_port
		global container_count
		global count
		global started
		current_port = (current_port + 1) % container_count
		print("Serviced by:"+str(current_port))
		#while(current_port not in port_list or len(port_list)==0):
		#	current_port = (current_port + 1) % container_count
		count += 1 
		if(started == False):
			started = True
			thread_scale.start()
			
		path = "http://127.0.0.1:800" +  str(current_port) + "/api/v1/" + str(path)
		#print(request.get_json())
		req_json = request.get_json()
		if ( "acts" in path and request.method == 'POST'):
			req_json['imgB64'] = req_json['imgB64'].replace("\n","")
			print(req_json['imgB64'])
		if request.method == "GET":
			resp = requests.get(url = path)
		elif request.method == "POST":
			resp = requests.post(url = path, json = req_json)
		else:
			resp = requests.delete(url = path, json = request.get_json())
		if(len(resp.content)==0):
			return '',resp.status_code
		else:
			print(resp)
			return jsonify(resp.json()),resp.status_code
	app.run(host="0.0.0.0",port=80)

def health_check():
	global containers_list
	global port_list
	global container_count
	while True:
		for cont in containers_list:
			#print(containers_list)
			port_dict = low_client.inspect_container(cont.id)['NetworkSettings']['Ports']
			#print(cont.status)
			#print("Inspecting: ",cont.short_id,"  ", port_dict)
			port = int(list(port_dict.values())[0][0]['HostPort'])
			#print("http://127.0.0.1:" +  str(port) + "/api/v1/_health")
			resp = requests.get("http://127.0.0.1:" +  str(port) + "/api/v1/_health")
			if(resp.status_code == 500):
		
				print("Container "+cont.short_id+" failed with port !"+ str(port))
				containers_list.remove(cont)
				port_list.remove(port)
				container_count = container_count - 1
				#image = cont.image
				thread_create_container = threading.Thread(target = replace_container , args=(cont, port,) )
				thread_create_container.start()
				print("Back to health check")
				'''
				new_cont = client.containers.run(image = "acts:latest", network="network1",name="acts_"+str(port),detach = True, ports = {'8000/tcp':('0.0.0.0',int(port))}) 
				print("Created")
				new_port_dict = low_client.inspect_container(new_cont.id)['NetworkSettings']['Ports']
				new_port = int(list(new_port_dict.values())[0][0]['HostPort'])
				port_list.append(new_port)
				containers_list.append(new_cont)
				#print("New Container :",new_cont.short_id)
				#print(new_port)
				#print(new_cont.status)
				#print(port_list)
				#print(containers_list)
				time.sleep(1)
				'''
		time.sleep(1)	

def scale():
	global count
	global started
	global container_count
	global containers_list
	global port_list
	while(True):
		'''
		while(started == False):
			print("Did not receive first request")
			time.sleep(1)
			continue;
		'''
		print("Going to sleep")
		time.sleep(120)	
		print("Current req count: ", count)
		print("Current container count: ", len(containers_list))
		if count<20:
			required = 1
		elif count<40:
			required = 2
		elif count<60:
			required = 3
		elif count<80:
			required = 4
		extra = required - len(containers_list)
		if(extra>0):
			for i in range(extra):
				new_port = max(port_list)+1
				thread_create_container = threading.Thread(target = create_container , args=(new_port,) )
				thread_create_container.start()
				print("Back to scale check")
		
		elif extra < 0:
			for i in range(-extra):
				print("Deleting")
				
				#del_cont = containers_list[0]
				#del_port_dict = low_client.inspect_container(del_cont.id)['NetworkSettings']['Ports']
				#del_port = int(list(del_port_dict.values())[0][0]['HostPort'])

				del_port = max(port_list)
				del_port_index = port_list.index(del_port)
				del_cont = containers_list[del_port_index]

				print("Deleting", del_cont.short_id, del_port)
				#del_cont.stop()
				#del_cont.remove()
				#print("Removed")
				container_count -= 1
				containers_list.remove(del_cont)
				port_list.remove(del_port)

				thread_del_container = threading.Thread(target = delete_container , args=(del_cont,) )
				thread_del_container.start()
				print("Back to scale check")
		

			

		'''
		if count % 20 != 0:
			required = count/20 +1
		else:
			required = math.ceil(count/20)+1
		print("Required: ",required)
		if ( required > len(containers_list)):
			print("Creating")
			new_port = max(port_list)+1
			
			thread_create_container = threading.Thread(target = create_container , args=(new_port,) )
			thread_create_container.start()
			print("Back to scale check")
			#new_cont = client.containers.run(image = "acts:latest", network="network1",name="acts_"+str(new_port),detach = True, ports = {'8000/tcp':('0.0.0.0',int(new_port))}) 
			#print("Created")
			#time.sleep(1)
			#port_list.append(new_port)
			#containers_list.append(new_cont)
			#container_count += 1
		elif ( required < len(containers_list)):
			print("Deleting")
			del_cont = containers_list[0]
			del_port_dict = low_client.inspect_container(del_cont.id)['NetworkSettings']['Ports']
			del_port = int(list(del_port_dict.values())[0][0]['HostPort'])
			print("Deleting", del_cont.short_id, del_port)
			#del_cont.stop()
			#del_cont.remove()
			#print("Removed")
			container_count -= 1
			containers_list.remove(del_cont)
			port_list.remove(del_port)

			thread_del_container = threading.Thread(target = delete_container , args=(del_cont,) )
			thread_del_container.start()
			print("Back to scale check")
			
		'''		
		count = 0
			



thread_api = threading.Thread(target = api)
thread_api.setDaemon(True)
thread_api.start()

thread_health_check = threading.Thread(target = health_check)
thread_health_check.setDaemon(True)
thread_health_check.start()

thread_scale = threading.Thread(target = scale)
thread_scale.setDaemon(True)
#thread_scale.start()


try:
    while True:
        time.sleep(1)    
    
except KeyboardInterrupt:
    thread_api.join()
    thread_health_check.join()
    thread_scale.join()
