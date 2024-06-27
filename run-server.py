import os

with open('js/env.template.js') as f:
    env_template = f.read()

env = env_template.replace('SIMULATOR_MQTT_PASSWORD', os.environ['SIMULATOR_MQTT_PASSWORD'])

with open('js/env.js', 'w') as f:
    f.write(env)

os.system('python3 -m http.server')