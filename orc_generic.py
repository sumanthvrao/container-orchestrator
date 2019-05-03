from flask import Flask, request, jsonify
import threading
import requests
import docker
import time
import json
import math
import yaml
import collections

client = docker.from_env()

low_client = docker.APIClient(base_url='unix://var/run/docker.sock')

mongo_cont = client.containers.get("mongo")
temp = client.containers.list()
temp.remove(mongo_cont)
containers_list = temp

yaml_config_file = "config.yaml"

with open(yaml_config_file, 'r') as yml_file:
    try:
        yaml_parsed_data = yaml.safe_load(yml_file)
    except yaml.YAMLError as exc:
        print(exc)

current_port = 8000
container_count = len(containers_list)
port_list = [8000]
for cont in containers_list:
	port_dict = low_client.inspect_container(cont.id)['NetworkSettings']['Ports']
	port = int(list(port_dict.values())[0][0]['HostPort'])
	port_list.append(port)

req_count = 0
started = False

app = Flask(__name__)

def replace_container(cont, port):
	global containers_list
	global port_list
	global container_count
	cont.stop()
	cont.remove()
	print("Removed container: ",cont.short_id)

	new_cont = client.containers.run(image = "acts:latest", network="network1",name="acts_"+str(port),detach = True, ports = {'8000/tcp':('0.0.0.0',int(port))})
	time.sleep(1)
	port_list.append(port)
	containers_list.append(new_cont)
	print("Replaced container: ", new_cont.short_id)
	print("---------------------")

def create_container(port):
	global containers_list
	global container_count
	new_cont = client.containers.run(image = "acts:latest", network="network1",name="acts_"+str(port),detach = True, ports = {'8000/tcp':('0.0.0.0',int(port))})
	time.sleep(1)

	port_list.append(port)
	containers_list.append(new_cont)
	container_count += 1
	print("Created container: ",new_cont.short_id)

def delete_container(del_cont):
	global container_count
	container_count-=1
	print("Removing container: ", del_cont.short_id)
	del_cont.stop()
	del_cont.remove()


def api():
	@app.route('/api/v1/<route>', methods = ["GET", "POST", "DELETE"])
	def handle_routes(route):
		print("Routing...")
		global current_port
		global container_count
		global req_count
		global started
		# ROUND ROBIN CODE:
		current_port = (current_port + 1) % container_count
		print("Serviced by:"+str(current_port))
		req_count += 1
		started = True
		path = "http://127.0.0.1:800" +  str(current_port) + "/api/v1/" + str(route)
		if request.method == "GET":
			resp = requests.get(url = path, json = request.get_json())
		elif request.method == "POST":
			resp = requests.post(url = path, json = request.get_json())
		else:
			resp = requests.delete(url = path)
		if(len(resp.content)==0):
			return '',resp.status_code
		else:
			return jsonify(resp.json()),resp.status_code
	app.run(host="0.0.0.0",port=80)

def health_check():
	global containers_list
	global port_list
	global container_count
	while True:
		for cont in containers_list:
			port_dict = low_client.inspect_container(cont.id)['NetworkSettings']['Ports']
			port = int(list(port_dict.values())[0][0]['HostPort'])
			resp = requests.get("http://127.0.0.1:" +  str(port) + "/api/v1/_health")
			if(resp.status_code == 500):
				print("Container "+cont.short_id+" failed with port !"+ str(port))
				containers_list.remove(cont)
				port_list.remove(port)

				thread_create_container = threading.Thread(target = replace_container , args=(cont, port,))
				thread_create_container.start()
				print("Back to health check")
		time.sleep(1)

def scale():
	global req_count
	global started
	global container_count
	global containers_list
	global port_list
	global yaml_parsed_data
	while(True):
		while(started == False):
			print("Did not receive first request")
			time.sleep(5)
			continue
		print("Current req_count: ", req_count)
		print("Current container count: ", len(containers_list))

		min_container = yaml_parsed_data['trigger']['min_instances']
		max_container = yaml_parsed_data['trigger']['max_instances']

		sleep_time = yaml_parsed_data['trigger']['monitor_time']
		if(yaml_parsed_data['trigger']['custom']):
			ordered_list = sorted(yaml_parsed_data['trigger']['custom_true_scale'])
			custom = False
		else:
			custom = True
			metric = yaml_parsed_data['trigger']['custom_false_scale']['metric_value']
			inc_by = yaml_parsed_data['trigger']['custom_false_scale']['increase_by']

		if not custom:
			range_v = []
			for ele in ordered_list:
				if ele[0] == -1:
					continue
				range_v.append(ele[0])
			range_v2 = range_v
			print(range_v2)

			index = -1
			for i in range (0,len(range_v2)):
				if range_v2[i] > req_count:
					index = i
					break
			if index == -1:
				required = ordered_list[0][1]
			required = ordered_list[index+1][1]

		else:

			if req_count % metric == 0:
				required = req_count/metric + 1
			else:
				required = math.ceil(req_count/metric)
			required = required * inc_by

		print("Required: ",required)
		if required < max_container:
			scale_up_or_down(min_container)
		elif required > max_container:
			scale_up_or_down(max_container)

		# Resetting req_count
		req_count = 0
		print("Going to sleep")
		time.sleep(sleep_time)

def scale_up_or_down(required):
	global req_count
	global started
	global container_count
	global containers_list
	global port_list
	global yaml_parsed_data
	if (required > len(containers_list)):
		print("Creating")
		diff = required - len(containers_list)

		for i in range(0,diff):
			new_port = max(port_list)+1
			thread_create_container = threading.Thread(target = create_container , args=(new_port,) )
			thread_create_container.start()
			print("Back to scale check")

	elif (required < len(containers_list)):
		print("Deleting")

		diff = len(containers_list) - required
		for i in range (0,diff):
			del_cont = containers_list[0]
			del_port_dict = low_client.inspect_container(del_cont.id)['NetworkSettings']['Ports']
			del_port = int(list(del_port_dict.values())[0][0]['HostPort'])
			print("Deleting", del_cont.short_id, del_port)
			containers_list.remove(del_cont)
			port_list.remove(del_port)

			thread_del_container = threading.Thread(target = delete_container , args=(del_cont,) )
			thread_del_container.start()
			print("Back to scale check")

thread_api = threading.Thread(target = api)
thread_api.setDaemon(True)
thread_api.start()

thread_health_check = threading.Thread(target = health_check)
thread_health_check.setDaemon(True)
thread_health_check.start()

thread_scale = threading.Thread(target = scale)
thread_scale.setDaemon(True)
thread_scale.start()

try:
    while True:
        time.sleep(1)

except KeyboardInterrupt:
    thread_api.join()
    thread_health_check.join()
    thread_scale.join()
