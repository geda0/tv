import bpy
import os

# Set the path to your character model
character_path = '/Users/marwanelgendy/workspace/blender/glasses.blend'
character_name = 'Ch03'

# Load the character model
with bpy.data.libraries.load(character_path) as (data_from, data_to):
    # Print available object names in the .blend file
    print("Available objects in the .blend file:")
    for name in data_from.objects:
        print(name)
        
    data_to.objects = [name for name in data_from.objects if name.startswith(character_name)]

# Link the character model to the current scene
scene = bpy.context.scene
for obj in data_to.objects:
    if obj is not None:
        scene.collection.objects.link(obj)

# Rest of the script

# Set the character in T-pose
character = bpy.data.objects[character_name]
character.rotation_euler = (0, 0, 0)

# Find the armature
armature = None
for obj in character.children:
    if obj.type == 'ARMATURE':
        armature = obj
        break

if armature:
    # Select the armature
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    # Enter Pose Mode
    bpy.ops.object.mode_set(mode='POSE')

    # Define the walk cycle animation
    walk_cycle = [
        {
            'bone': 'upper_leg_L',
            'frame': 0,
            'rotation': (0.5, 0, 0),
        },
        {
            'bone': 'upper_leg_R',
            'frame': 10,
            'rotation': (-0.5, 0, 0),
        },
        {
            'bone': 'upper_leg_L',
            'frame': 20,
            'rotation': (-0.5, 0, 0),
        },
        {
            'bone': 'upper_leg_R',
            'frame': 30,
            'rotation': (0.5, 0, 0),
        },
    ]

    # Create keyframes for the walk cycle
    for keyframe in walk_cycle:
        bone = armature.pose.bones[keyframe['bone']]
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = keyframe['rotation']
        bone.keyframe_insert(data_path='rotation_euler', frame=keyframe['frame'])

    # Set the animation length to match the walk cycle
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = 30

    # Return to Object Mode
    bpy.ops.object.mode_set(mode='OBJECT')
else:
    print('No armature found in the character model.')
