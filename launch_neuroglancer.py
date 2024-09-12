import neuroglancer as ng
from neuroglancer.server import global_server_args

global_server_args['bind_port'] = '9999'

viewer = ng.Viewer(token='1')

print(viewer.get_viewer_url())
